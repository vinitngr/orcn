package ollama

// Live Ollama library adapter.
//
// Instead of a precoded models.json baked into the binary, search queries
// the public Ollama library (https://ollama.com/search) and parses the
// server-rendered result cards. Each card carries the model name,
// description, capability tags (tools, thinking, vision, embedding,
// decision), size tags (9b, 70b, …) and pull counts — everything needed
// to serve model search without vendoring the registry.
//
// The page is plain server-rendered HTML (Go templates + htmx), so a small
// focused stdlib-only parser (regexp over stable card structure) is enough;
// no HTML library dependency is pulled in. Results are cached in memory
// with a TTL, and the last-good result is served when the library is
// unreachable, so deploys keep working offline.

import (
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"orcn/core"
)

const (
	librarySearchURL = "https://ollama.com/search"
	libraryCacheTTL  = 10 * time.Minute
	libraryTimeout   = 20 * time.Second
	libraryUserAgent = "orcn-gateway/1.0 (+model-search)"
	maxSearchResults = 50
)

// libraryModel is one parsed ollama.com search hit.
type libraryModel struct {
	// Name is the pullable name, e.g. "nimble" or "parthsareen/nimble".
	Name string
	// Namespace is "library" for official models, else the user/namespace.
	Namespace   string
	Description string
	// Tags are the library capability tags (tools, thinking, vision,
	// embedding, decision) plus the size tag (9b, …).
	Tags       []string
	Pulls      int
	Parameters float64 // billions, parsed from the size tag when present
}

// libraryQuery is the per-runtime translation of a canonical task into an
// Ollama library search: server-side `c` filters plus strict client-side
// tag matching. A hit must carry the task's own tag — pipelines never leak
// across tasks (a tools/thinking model is NOT a decision result).
type libraryQuery struct {
	// filters are ollama.com ?c= capability values applied server-side.
	filters []string
	// matchTags are library tags a hit must carry (union: any one matches).
	// Empty means accept every hit (text-generation).
	matchTags []string
}

// taskLibraryQuery maps a canonical orcn task to an Ollama library search.
// Rerankers (score) have no Ollama equivalent and are rejected so callers
// can point users at vLLM instead.
func taskLibraryQuery(task core.ModelTask) (libraryQuery, error) {
	switch core.NormalizeModelTask(task) {
	case core.TaskTextGeneration:
		return libraryQuery{}, nil
	case core.TaskEmbedding:
		return libraryQuery{filters: []string{"embedding"}, matchTags: []string{"embedding"}}, nil
	case core.TaskMultimodal:
		return libraryQuery{filters: []string{"vision"}, matchTags: []string{"vision"}}, nil
	case core.TaskDecision:
		return libraryQuery{filters: []string{"decision"}, matchTags: []string{"decision"}}, nil
	default:
		return libraryQuery{}, fmt.Errorf("ollama does not support task %q", task)
	}
}

// --- result cache (TTL + last-good fallback) ---

type libraryCacheEntry struct {
	models    []libraryModel
	fetchedAt time.Time
}

var libraryCache = struct {
	sync.Mutex
	byQuery map[string]libraryCacheEntry
	byName  map[string]libraryModel
}{byQuery: make(map[string]libraryCacheEntry), byName: make(map[string]libraryModel)}

// searchLibrary runs a live library search, consulting the cache first and
// falling back to the last-good cached result when the library is down.
func searchLibrary(query string, filters []string) ([]libraryModel, error) {
	key := query + "\x00" + strings.Join(filters, ",")

	libraryCache.Lock()
	if entry, ok := libraryCache.byQuery[key]; ok && time.Since(entry.fetchedAt) < libraryCacheTTL {
		models := entry.models
		libraryCache.Unlock()
		return models, nil
	}
	libraryCache.Unlock()

	models, err := fetchLibrarySearch(query, filters)
	if err != nil {
		libraryCache.Lock()
		defer libraryCache.Unlock()
		if entry, ok := libraryCache.byQuery[key]; ok && len(entry.models) > 0 {
			ollamaLog.Error("Ollama library unreachable, serving %d stale results for %q: %v", len(entry.models), query, err)
			return entry.models, nil
		}
		return nil, fmt.Errorf("ollama library search failed: %w", err)
	}

	libraryCache.Lock()
	defer libraryCache.Unlock()
	libraryCache.byQuery[key] = libraryCacheEntry{models: models, fetchedAt: time.Now()}
	if len(libraryCache.byName) > 2000 {
		libraryCache.byName = make(map[string]libraryModel)
	}
	for _, m := range models {
		libraryCache.byName[m.Name] = m
	}
	return models, nil
}

// lookupLibraryModel returns a cached model by pullable name, or false.
func lookupLibraryModel(name string) (libraryModel, bool) {
	libraryCache.Lock()
	defer libraryCache.Unlock()
	m, ok := libraryCache.byName[name]
	return m, ok
}

// --- HTTP fetch + parse ---

var libraryHTTP = &http.Client{Timeout: libraryTimeout}

func fetchLibrarySearch(query string, filters []string) ([]libraryModel, error) {
	params := url.Values{}
	params.Set("q", query)
	for _, f := range filters {
		params.Add("c", f)
	}
	req, err := http.NewRequest(http.MethodGet, librarySearchURL+"?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", libraryUserAgent)
	req.Header.Set("Accept", "text/html")

	resp, err := libraryHTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %s", resp.Status)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	return parseLibrarySearch(string(body)), nil
}

// --- stdlib-only card parser ---
//
// Result cards look like:
//
//	<li class="flex items-baseline border-b ...">
//	  <a href="/library/nimble" class="group w-full">
//	    ... <h2 ...><span>nimble</span></h2>
//	    <p class="max-w-lg ...">description</p>
//	    <span class="... bg-indigo-50 ...">tools</span>   <- capability tags
//	    <span class="... bg-[#ddf4ff] ...">9b</span>      <- size tag
//	    ... <span>21.6K</span><span ...>&nbsp;Pulls</span>
//	  </a>
//	</li>
//
// Namespaced models link to /<namespace>/<model> instead of /library/<model>.

var (
	libraryCardRe  = regexp.MustCompile(`(?s)<li\s+class="flex items-baseline border-b[^"]*"[^>]*>(.*?)</li>`)
	libraryLinkRe  = regexp.MustCompile(`<a\s+href="([^"]+)"`)
	libraryDescRe  = regexp.MustCompile(`<p\s+class="max-w-lg[^"]*"[^>]*>([^<]*)</p>`)
	libraryCapRe   = regexp.MustCompile(`<span[^>]*bg-indigo-50[^>]*>([^<]+)</span>`)
	librarySizeRe  = regexp.MustCompile(`<span[^>]*ddf4ff[^>]*>([^<]+)</span>`)
	libraryCloudRe = regexp.MustCompile(`<span[^>]*bg-cyan-50[^>]*>([^<]+)</span>`)
	libraryPullRe  = regexp.MustCompile(`<span[^>]*>([\d,\.]+[KkMm]?)</span>\s*<span[^>]*>(?:&nbsp;|\s)*Pulls</span>`)
	libraryTagsRe  = regexp.MustCompile(`<span[^>]*>(\d+)</span>\s*<span[^>]*>(?:&nbsp;|\s)*Tags?</span>`)
	librarySizeVal = regexp.MustCompile(`^(\d+(?:\.\d+)?)\s*([bBmM])$`)
	// Model page patterns (direct library probe).
	libraryTitleRe   = regexp.MustCompile(`<title>([^<]+)</title>`)
	libraryMetaDesc  = regexp.MustCompile(`<meta\s+name="description"\s+content="([^"]*)"`)
	libraryModelName = regexp.MustCompile(`^[A-Za-z0-9_][A-Za-z0-9_.\-/]*$`)
)

// libraryNonModelPaths are two-segment site paths that are pages, not models.
var libraryNonModelPaths = map[string]bool{
	"search": true, "docs": true, "pricing": true, "download": true,
	"signin": true, "signup": true, "blog": true, "api": true,
	"public": true, "cloud": true, "company": true,
}

func parseLibrarySearch(page string) []libraryModel {
	models := make([]libraryModel, 0, 16)
	for _, card := range libraryCardRe.FindAllStringSubmatch(page, -1) {
		m, ok := parseLibraryCard(card[1])
		if !ok {
			continue
		}
		models = append(models, m)
		if len(models) >= maxSearchResults {
			break
		}
	}
	return models
}

func parseLibraryCard(card string) (libraryModel, bool) {
	link := libraryLinkRe.FindStringSubmatch(card)
	if link == nil {
		return libraryModel{}, false
	}
	namespace, name, ok := splitLibraryPath(link[1])
	if !ok {
		return libraryModel{}, false
	}

	// A `cloud` marker means the model is *also* on Ollama Cloud — but when it
	// is the model's only tag (Tags == 1, e.g. kimi-k3) there is no local
	// variant to `ollama pull`, so it is skipped. Models like gpt-oss carry
	// the marker alongside real local tags and are kept.
	cloud := false
	for _, tag := range libraryCloudRe.FindAllStringSubmatch(card, -1) {
		if strings.TrimSpace(strings.ToLower(tag[1])) == "cloud" {
			cloud = true
			break
		}
	}
	if cloud {
		if tm := libraryTagsRe.FindStringSubmatch(card); tm != nil {
			if n, err := strconv.Atoi(tm[1]); err == nil && n <= 1 {
				return libraryModel{}, false
			}
		}
		// Tag count unknown: fail open (recall beats precision here —
		// hiding an official family is worse than listing a cloud model).
	}

	var m libraryModel
	m.Namespace = namespace
	if namespace == "library" {
		m.Name = name
	} else {
		m.Name = namespace + "/" + name
	}
	if dm := libraryDescRe.FindStringSubmatch(card); dm != nil {
		m.Description = strings.TrimSpace(html.UnescapeString(dm[1]))
	}
	for _, tag := range libraryCapRe.FindAllStringSubmatch(card, -1) {
		if t := strings.TrimSpace(strings.ToLower(html.UnescapeString(tag[1]))); t != "" {
			m.Tags = append(m.Tags, t)
		}
	}
	sizes := librarySizeRe.FindAllStringSubmatch(card, -1)
	for i, sm := range sizes {
		size := strings.TrimSpace(strings.ToLower(html.UnescapeString(sm[1])))
		if size == "" {
			continue
		}
		m.Tags = append(m.Tags, size)
		if i == 0 {
			m.Parameters = parseSizeTag(size)
		}
	}
	if pm := libraryPullRe.FindStringSubmatch(card); pm != nil {
		m.Pulls = parsePullCount(pm[1])
	}
	return m, true
}

func splitLibraryPath(href string) (namespace, name string, ok bool) {
	href = strings.TrimSuffix(href, "/")
	parts := strings.Split(strings.TrimPrefix(href, "/"), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	if parts[0] != "library" && libraryNonModelPaths[strings.ToLower(parts[0])] {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func parseSizeTag(size string) float64 {
	m := librarySizeVal.FindStringSubmatch(strings.TrimSpace(size))
	if m == nil {
		return 0
	}
	value, err := strconv.ParseFloat(m[1], 64)
	if err != nil {
		return 0
	}
	if strings.ToLower(m[2]) == "m" {
		return value / 1000
	}
	return value
}

func parsePullCount(raw string) int {
	s := strings.ReplaceAll(strings.TrimSpace(raw), ",", "")
	mult := 1.0
	if strings.HasSuffix(s, "K") || strings.HasSuffix(s, "k") {
		mult = 1000
		s = s[:len(s)-1]
	} else if strings.HasSuffix(s, "M") || strings.HasSuffix(s, "m") {
		mult = 1000000
		s = s[:len(s)-1]
	}
	value, err := strconv.ParseFloat(strings.TrimSpace(s), 64)
	if err != nil {
		return 0
	}
	return int(value * mult)
}

// --- query normalization + exact-match ranking ---

// stripLibraryTag splits "gpt-oss:latest" into "gpt-oss". Registry names
// never contain ":", so the first colon always starts the tag.
func stripLibraryTag(query string) string {
	if i := strings.Index(query, ":"); i >= 0 {
		return strings.TrimSpace(query[:i])
	}
	return strings.TrimSpace(query)
}

// normalizeLibraryName canonicalizes a model name for comparison:
// lowercase, no tag, hyphens/underscores/spaces ignored. Lets "gptoss"
// equal "gpt-oss" and "gpt-oss:latest" equal "gpt-oss".
func normalizeLibraryName(name string) string {
	name = stripLibraryTag(strings.ToLower(name))
	name = strings.ReplaceAll(name, "-", "")
	name = strings.ReplaceAll(name, "_", "")
	return strings.ReplaceAll(name, " ", "")
}

// looksLikeModelName reports whether the query could be a direct model
// reference (single token, no spaces) worth probing in the library.
func looksLikeModelName(base string) bool {
	base = stripLibraryTag(base)
	return base != "" && !strings.Contains(base, " ") && libraryModelName.MatchString(base)
}

// hasExactLibraryMatch reports whether any hit is exactly the requested
// model (normalization-insensitive).
func hasExactLibraryMatch(models []libraryModel, query string) bool {
	want := normalizeLibraryName(query)
	if want == "" {
		return false
	}
	for _, m := range models {
		if normalizeLibraryName(m.Name) == want {
			return true
		}
	}
	return false
}

// rankLibraryModels floats exact (normalization-insensitive) matches to the
// top, preserving the library's relative order everywhere else. This keeps
// the official family above forks when the user names it directly.
func rankLibraryModels(models []libraryModel, query string) []libraryModel {
	want := normalizeLibraryName(query)
	if want == "" {
		return models
	}
	exact := make([]libraryModel, 0, len(models))
	rest := make([]libraryModel, 0, len(models))
	for _, m := range models {
		if normalizeLibraryName(m.Name) == want {
			exact = append(exact, m)
		} else {
			rest = append(rest, m)
		}
	}
	return append(exact, rest...)
}

// --- direct library probe ---
//
// When search misses the exact model (bad relevance, brand-new release),
// fetch its library page directly: /library/<name> or /<ns>/<name>.
// Model pages are server-rendered and carry <title>, meta description and
// :tag variant links — enough to build a deployable hit.

// probeLibraryModel fetches and parses a library model page. It returns
// false when the page does not exist or offers no pullable (non-cloud) tag.
func probeLibraryModel(base string) (libraryModel, bool) {
	pagePath := base
	if !strings.Contains(base, "/") {
		pagePath = "library/" + base
	}
	req, err := http.NewRequest(http.MethodGet, "https://ollama.com/"+pagePath, nil)
	if err != nil {
		return libraryModel{}, false
	}
	req.Header.Set("User-Agent", libraryUserAgent)
	req.Header.Set("Accept", "text/html")
	resp, err := libraryHTTP.Do(req)
	if err != nil {
		return libraryModel{}, false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return libraryModel{}, false
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return libraryModel{}, false
	}
	m, ok := parseLibraryModelPage(string(body), base, pagePath)
	if !ok {
		return libraryModel{}, false
	}
	libraryCache.Lock()
	defer libraryCache.Unlock()
	if len(libraryCache.byName) > 2000 {
		libraryCache.byName = make(map[string]libraryModel)
	}
	libraryCache.byName[m.Name] = m
	libraryCache.byName[base] = m
	return m, true
}

func parseLibraryModelPage(page, want, pagePath string) (libraryModel, bool) {
	title := libraryTitleRe.FindStringSubmatch(page)
	if title == nil {
		return libraryModel{}, false
	}
	got := strings.TrimSpace(title[1])
	last := want
	if i := strings.LastIndex(want, "/"); i >= 0 {
		last = want[i+1:]
	}
	if !strings.EqualFold(got, want) && !strings.EqualFold(got, last) {
		return libraryModel{}, false
	}

	var m libraryModel
	m.Name = want
	if strings.Contains(want, "/") {
		m.Namespace = want[:strings.Index(want, "/")]
	} else {
		m.Namespace = "library"
	}
	if dm := libraryMetaDesc.FindStringSubmatch(page); dm != nil {
		m.Description = strings.TrimSpace(html.UnescapeString(dm[1]))
	}

	// Pullable variants: /<pagePath>:<tag> links excluding *-cloud ones.
	// No local variant => cloud-only => not deployable via `ollama pull`.
	variantRe := regexp.MustCompile(`href="/` + regexp.QuoteMeta(pagePath) + `:([^"/]+)"`)
	seen := make(map[string]bool)
	var order []string
	var sizes []string
	smallest, smallestVal := "", 0.0
	for _, vm := range variantRe.FindAllStringSubmatch(page, -1) {
		variant := strings.TrimSpace(vm[1])
		lower := strings.ToLower(variant)
		if variant == "" || lower == "cloud" || strings.HasSuffix(lower, "-cloud") || seen[variant] {
			continue
		}
		seen[variant] = true
		order = append(order, variant)
		if v := parseSizeTag(variant); v > 0 {
			sizes = append(sizes, lower)
			if smallestVal == 0 || v < smallestVal {
				smallest, smallestVal = variant, v
			}
		}
	}
	if len(order) == 0 {
		return libraryModel{}, false
	}
	// The returned name must work with `ollama pull <name>`: bare names
	// resolve to :latest, so only keep the name bare when :latest exists;
	// otherwise pin the smallest concrete variant.
	hasLatest := false
	for _, v := range order {
		if strings.EqualFold(v, "latest") {
			hasLatest = true
			break
		}
	}
	m.Name = want
	if !hasLatest {
		if smallest != "" {
			m.Name = want + ":" + smallest
		} else {
			m.Name = want + ":" + order[0]
		}
	}
	// Capability tags shown on the model page (same indigo chips).
	for _, tag := range libraryCapRe.FindAllStringSubmatch(page, -1) {
		if t := strings.TrimSpace(strings.ToLower(html.UnescapeString(tag[1]))); t != "" {
			m.Tags = append(m.Tags, t)
		}
	}
	m.Tags = append(m.Tags, sizes...)
	// Smallest variant as the parameter estimate (matches the default pull).
	m.Parameters = smallestVal
	return m, true
}

// hasAllTags reports whether the model carries every requested tag.
func hasAllTags(modelTags []string, required []string) bool {
	if len(required) == 0 {
		return true
	}
	set := make(map[string]bool, len(modelTags))
	for _, t := range modelTags {
		set[strings.ToLower(t)] = true
	}
	for _, r := range required {
		if !set[strings.ToLower(r)] {
			return false
		}
	}
	return true
}

// hasAnyTag reports whether the model carries at least one of the tags.
// Empty matchTags accepts everything.
func hasAnyTag(modelTags []string, matchTags []string) bool {
	if len(matchTags) == 0 {
		return true
	}
	set := make(map[string]bool, len(modelTags))
	for _, t := range modelTags {
		set[strings.ToLower(t)] = true
	}
	for _, m := range matchTags {
		if set[strings.ToLower(m)] {
			return true
		}
	}
	return false
}
