package vllm

import (
	"fmt"
	"strconv"
	"strings"

	"orcn/core"
)

// vllmMaxContextLength is a sanity ceiling for --max-model-len. No supported
// model serves contexts beyond this, so anything larger is almost certainly a
// typo that would otherwise surface as an obscure vLLM start-up failure.
const vllmMaxContextLength = 2_000_000

// validateAdvancedConfig validates the user supplied advanced configuration
// against the task schema and vLLM's own argument rules. It fails fast so that
// invalid flags (for example "max_model_len=0") are rejected before a container
// is ever scheduled, instead of crashing the vLLM process at start-up.
//
// runtimeConfig may be nil when the model metadata could not be retrieved; in
// that case only the locally verifiable rules are applied.
func validateAdvancedConfig(task core.ModelTask, config map[string]string, schema []core.ConfigOption, runtimeConfig *modelRuntimeConfig) error {
	if len(schema) == 0 {
		return nil
	}

	var errs []string
	known := make(map[string]core.ConfigOption, len(schema))
	for _, option := range schema {
		known[option.Key] = option
	}

	for key := range config {
		if key == "image" {
			continue
		}
		if _, ok := known[key]; !ok {
			errs = append(errs, fmt.Sprintf("unknown option %q", key))
		}
	}

	for _, option := range schema {
		raw, ok := config[option.Key]
		if !ok {
			continue
		}
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		errs = append(errs, validateOption(option, raw)...)
	}

	errs = append(errs, validateIntegerOptions(config)...)
	errs = append(errs, validateMaxModelLen(config, runtimeConfig)...)

	if len(errs) == 0 {
		return nil
	}
	return fmt.Errorf("invalid vLLM configuration for %s: %s", task, strings.Join(errs, "; "))
}

// validateOption applies the type and range rules declared by a ConfigOption.
func validateOption(option core.ConfigOption, raw string) []string {
	switch option.Type {
	case "number":
		value, err := strconv.ParseFloat(raw, 64)
		if err != nil {
			return []string{fmt.Sprintf("%s must be a number, got %q", option.Key, raw)}
		}
		var errs []string
		if option.Min != nil && value < *option.Min {
			errs = append(errs, fmt.Sprintf("%s must be at least %s", option.Key, formatBound(*option.Min)))
		}
		if option.Max != nil && value > *option.Max {
			errs = append(errs, fmt.Sprintf("%s must be at most %s", option.Key, formatBound(*option.Max)))
		}
		return errs
	case "boolean":
		if _, err := strconv.ParseBool(raw); err != nil {
			return []string{fmt.Sprintf("%s must be true or false, got %q", option.Key, raw)}
		}
		return nil
	case "select":
		for _, allowed := range option.Options {
			if raw == allowed {
				return nil
			}
		}
		return []string{fmt.Sprintf("%s has unsupported value %q (allowed: %s)", option.Key, raw, strings.Join(option.Options, ", "))}
	default:
		return nil
	}
}

// validateIntegerOptions checks flags that vLLM requires to be positive
// integers. These are enforced here so a zero or negative value can never be
// forwarded as a command line argument.
func validateIntegerOptions(config map[string]string) []string {
	var errs []string
	for key, min := range map[string]int{
		"max_model_len":          1,
		"max_num_seqs":           1,
		"max_num_batched_tokens": 1,
		"tensor_parallel":        0,
		"cpu_offload_gb":         0,
	} {
		raw, ok := config[key]
		if !ok {
			continue
		}
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		value, err := strconv.Atoi(raw)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s must be an integer, got %q", key, raw))
			continue
		}
		if value < min {
			errs = append(errs, fmt.Sprintf("%s must be at least %d, got %d", key, min, value))
		}
	}
	return errs
}

// validateMaxModelLen verifies the requested context window is positive and
// does not exceed the model's native maximum. This mirrors the check vLLM
// performs internally and is the exact class of failure that produced a crash
// when "max_model_len=0" was passed through to the server.
func validateMaxModelLen(config map[string]string, runtimeConfig *modelRuntimeConfig) []string {
	raw, ok := config["max_model_len"]
	if !ok {
		return nil
	}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}

	requestedLength, err := strconv.Atoi(raw)
	if err != nil || requestedLength <= 0 {
		return []string{fmt.Sprintf("max_model_len must be a positive integer, got %q", raw)}
	}
	if requestedLength > vllmMaxContextLength {
		return []string{fmt.Sprintf("max_model_len %d is unrealistically large (maximum %d)", requestedLength, vllmMaxContextLength)}
	}
	if runtimeConfig == nil {
		return nil
	}
	if modelLimit := modelMaxLength(runtimeConfig.Config); modelLimit > 0 && requestedLength > modelLimit {
		return []string{fmt.Sprintf("max_model_len %d exceeds the model limit of %d", requestedLength, modelLimit)}
	}
	return nil
}

func formatBound(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64)
}
