package ollama

import (
	"reflect"
	"testing"
)

const testSearchPage = `
<ul role="list" class="grid grid-cols-1">
<li  class="flex items-baseline border-b border-neutral-200 py-6">
  <a href="/library/nimble" class="group w-full">
    <div class="flex flex-col mb-1" title="nimble">
      <h2 class="truncate text-xl font-medium underline-offset-2 group-hover:underline md:text-2xl">
        <span >nimble</span>
      </h2>
      <p class="max-w-lg break-words text-neutral-800 text-md">A 9B decision model from Bespoke Labs.</p>
    </div>
    <div class="flex flex-col">
      <div class="flex flex-wrap space-x-2">
          <span  class="inline-flex my-1 items-center rounded-md bg-indigo-50 px-2 py-[2px] text-xs font-medium text-indigo-600 sm:text-[13px]">tools</span>
          <span  class="inline-flex my-1 items-center rounded-md bg-indigo-50 px-2 py-[2px] text-xs font-medium text-indigo-600 sm:text-[13px]">decision</span>
          <span  class="inline-flex my-1 items-center rounded-md bg-[#ddf4ff] px-2 py-[2px] text-xs font-medium text-blue-600 sm:text-[13px]">9b</span>
      </div>
      <p class="my-1 flex space-x-5 text-[13px] font-medium text-neutral-500">
          <span class="flex items-center">
            <svg></svg>
            <span >21.6K</span>
            <span class="hidden sm:flex">&nbsp;Pulls</span>
          </span>
          <span class="flex items-center">
            <span >8</span>
            <span class="hidden sm:flex">&nbsp;Tags</span>
          </span>
      </p>
    </div>
  </a>
</li>
<li  class="flex items-baseline border-b border-neutral-200 py-6">
  <a href="/library/kimi-k3" class="group w-full">
    <div class="flex flex-col mb-1" title="kimi-k3">
      <h2 class="truncate"><span >kimi-k3</span></h2>
      <p class="max-w-lg break-words text-neutral-800 text-md">Multimodal agentic model.</p>
    </div>
    <div class="flex flex-col">
      <div class="flex flex-wrap space-x-2">
          <span  class="inline-flex my-1 items-center rounded-md bg-indigo-50 px-2 py-[2px] text-xs font-medium text-indigo-600 sm:text-[13px]">vision</span>
          <span class="inline-flex my-1 items-center rounded-md bg-cyan-50 px-2 py-[2px] text-xs font-medium text-cyan-500 sm:text-[13px]">cloud</span>
      </div>
      <p class="my-1 flex space-x-5 text-[13px] font-medium text-neutral-500">
          <span class="flex items-center">
            <span >96.1K</span>
            <span class="hidden sm:flex">&nbsp;Pulls</span>
          </span>
          <span class="flex items-center">
            <span >1</span>
            <span class="hidden sm:flex">&nbsp;Tag</span>
          </span>
      </p>
    </div>
  </a>
</li>
<li  class="flex items-baseline border-b border-neutral-200 py-6">
  <a href="/parthsareen/nimble" class="group w-full">
    <div class="flex flex-col mb-1" title="nimble">
      <h2 class="truncate"><span >parthsareen/nimble</span></h2>
      <p class="max-w-lg break-words text-neutral-800 text-md"></p>
    </div>
    <div class="flex flex-col">
      <div class="flex flex-wrap space-x-2">
          <span  class="inline-flex my-1 items-center rounded-md bg-indigo-50 px-2 py-[2px] text-xs font-medium text-indigo-600 sm:text-[13px]">thinking</span>
      </div>
      <p class="my-1 flex space-x-5 text-[13px] font-medium text-neutral-500">
          <span class="flex items-center">
            <span >27</span>
            <span class="hidden sm:flex">&nbsp;Pulls</span>
          </span>
      </p>
    </div>
  </a>
</li>
</ul>
`

func TestParseLibrarySearch(t *testing.T) {
	models := parseLibrarySearch(testSearchPage)
	// kimi-k3 is cloud-hosted only and must be skipped.
	if len(models) != 2 {
		t.Fatalf("expected 2 models (cloud-only skipped), got %d: %+v", len(models), models)
	}

	nimble := models[0]
	if nimble.Name != "nimble" || nimble.Namespace != "library" {
		t.Errorf("unexpected identity: %+v", nimble)
	}
	if nimble.Description != "A 9B decision model from Bespoke Labs." {
		t.Errorf("unexpected description: %q", nimble.Description)
	}
	if !reflect.DeepEqual(nimble.Tags, []string{"tools", "decision", "9b"}) {
		t.Errorf("unexpected tags: %v", nimble.Tags)
	}
	if nimble.Pulls != 21600 {
		t.Errorf("unexpected pulls: %d", nimble.Pulls)
	}
	if nimble.Parameters != 9 {
		t.Errorf("unexpected parameters: %v", nimble.Parameters)
	}

	ns := models[1]
	if ns.Name != "parthsareen/nimble" || ns.Namespace != "parthsareen" {
		t.Errorf("unexpected namespaced identity: %+v", ns)
	}
	if ns.Pulls != 27 {
		t.Errorf("unexpected pulls: %d", ns.Pulls)
	}
}

func TestTaskLibraryQuery(t *testing.T) {
	q, err := taskLibraryQuery("decision")
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(q.filters, []string{"decision"}) {
		t.Errorf("unexpected decision filters: %v", q.filters)
	}
	if !reflect.DeepEqual(q.matchTags, []string{"decision"}) {
		t.Errorf("decision must match strictly on its own tag, got %v", q.matchTags)
	}
	if _, err := taskLibraryQuery("score"); err == nil {
		t.Error("expected score to be rejected for ollama")
	}
}

func TestParseHelpers(t *testing.T) {
	if got := parsePullCount("1.3M"); got != 1300000 {
		t.Errorf("pulls M: %d", got)
	}
	if got := parsePullCount("3,897"); got != 3897 {
		t.Errorf("pulls comma: %d", got)
	}
	if got := parseSizeTag("123b"); got != 123 {
		t.Errorf("size b: %v", got)
	}
	if got := parseSizeTag("350m"); got != 0.35 {
		t.Errorf("size m: %v", got)
	}
	if !hasAllTags([]string{"tools", "thinking"}, []string{"tools"}) {
		t.Error("hasAllTags should pass")
	}
	if hasAllTags([]string{"tools"}, []string{"tools", "thinking"}) {
		t.Error("hasAllTags should fail on missing tag")
	}
}

const testHybridCloudCard = `
<li  class="flex items-baseline border-b border-neutral-200 py-6">
  <a href="/library/gpt-oss" class="group w-full">
    <div class="flex flex-col mb-1" title="gpt-oss">
      <h2 class="truncate"><span >gpt-oss</span></h2>
      <p class="max-w-lg break-words text-neutral-800 text-md">OpenAI&#39;s open-weight models.</p>
    </div>
    <div class="flex flex-col">
      <div class="flex flex-wrap space-x-2">
          <span  class="inline-flex my-1 items-center rounded-md bg-indigo-50 px-2 py-[2px] text-xs font-medium text-indigo-600 sm:text-[13px]">tools</span>
          <span  class="inline-flex my-1 items-center rounded-md bg-indigo-50 px-2 py-[2px] text-xs font-medium text-indigo-600 sm:text-[13px]">thinking</span>
          <span class="inline-flex my-1 items-center rounded-md bg-cyan-50 px-2 py-[2px] text-xs font-medium text-cyan-500 sm:text-[13px]">cloud</span>
          <span  class="inline-flex my-1 items-center rounded-md bg-[#ddf4ff] px-2 py-[2px] text-xs font-medium text-blue-600 sm:text-[13px]">20b</span>
          <span  class="inline-flex my-1 items-center rounded-md bg-[#ddf4ff] px-2 py-[2px] text-xs font-medium text-blue-600 sm:text-[13px]">120b</span>
      </div>
      <p class="my-1 flex space-x-5 text-[13px] font-medium text-neutral-500">
          <span class="flex items-center">
            <span >13.4M</span>
            <span class="hidden sm:flex">&nbsp;Pulls</span>
          </span>
          <span class="flex items-center">
            <span >5</span>
            <span class="hidden sm:flex">&nbsp;Tags</span>
          </span>
      </p>
    </div>
  </a>
</li>
`

func TestParseHybridCloudCardKept(t *testing.T) {
	models := parseLibrarySearch(testHybridCloudCard)
	if len(models) != 1 {
		t.Fatalf("expected hybrid cloud+local card to be kept, got %d", len(models))
	}
	m := models[0]
	if m.Name != "gpt-oss" {
		t.Errorf("unexpected name: %q", m.Name)
	}
	if !reflect.DeepEqual(m.Tags, []string{"tools", "thinking", "20b", "120b"}) {
		t.Errorf("unexpected tags: %v", m.Tags)
	}
	if m.Pulls != 13400000 {
		t.Errorf("unexpected pulls: %d", m.Pulls)
	}
	if m.Description != "OpenAI's open-weight models." {
		t.Errorf("entities not unescaped: %q", m.Description)
	}
}

func TestQueryNormalization(t *testing.T) {
	if got := stripLibraryTag("gpt-oss:latest"); got != "gpt-oss" {
		t.Errorf("strip tag: %q", got)
	}
	if normalizeLibraryName("gptoss") != normalizeLibraryName("gpt-oss:latest") {
		t.Error("gptoss should normalize equal to gpt-oss:latest")
	}
	if !looksLikeModelName("gpt-oss") || !looksLikeModelName("ns/model:tag") {
		t.Error("valid model names rejected")
	}
	if looksLikeModelName("two words") || looksLikeModelName("") {
		t.Error("invalid model names accepted")
	}
}

func TestRankExactFirst(t *testing.T) {
	models := []libraryModel{
		{Name: "gpt-oss-safeguard"},
		{Name: "fauxpaslife/gpt-oss-20B-Q5_K_M"},
		{Name: "gpt-oss"},
	}
	ranked := rankLibraryModels(models, "gptoss")
	if ranked[0].Name != "gpt-oss" {
		t.Errorf("exact match not floated to top: %+v", ranked)
	}
	if !hasExactLibraryMatch(ranked, "gpt-oss:latest") {
		t.Error("exact match not detected across tag suffix")
	}
	if hasExactLibraryMatch(ranked, "llama") {
		t.Error("false exact match")
	}
}

const testModelPage = `
<html><head><title>gpt-oss</title>
<meta name="description" content="OpenAI&#39;s open-weight models."/>
</head><body>
<div class="flex flex-wrap gap-2">
<span class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 sm:text-[13px]">thinking</span>
<span class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 sm:text-[13px]">tools</span>
</div>
<a href="/library/gpt-oss:120b">120b</a>
<a href="/library/gpt-oss:120b-cloud">120b-cloud</a>
<a href="/library/gpt-oss:20b">20b</a>
<a href="/library/gpt-oss:latest">latest</a>
</body></html>
`

func TestParseLibraryModelPage(t *testing.T) {
	m, ok := parseLibraryModelPage(testModelPage, "gpt-oss", "library/gpt-oss")
	if !ok {
		t.Fatal("model page not parsed")
	}
	if m.Name != "gpt-oss" || m.Namespace != "library" {
		t.Errorf("unexpected identity: %+v", m)
	}
	if m.Description != "OpenAI's open-weight models." {
		t.Errorf("unexpected description: %q", m.Description)
	}
	for _, wantTag := range []string{"thinking", "tools", "20b", "120b"} {
		found := false
		for _, t := range m.Tags {
			if t == wantTag {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected tag %q in %v", wantTag, m.Tags)
		}
	}
	if m.Parameters != 20 {
		t.Errorf("expected smallest variant 20B, got %v", m.Parameters)
	}

	// Page without :latest pins the smallest concrete variant so
	// `ollama pull <name>` is guaranteed to resolve.
	noLatest := `<html><head><title>foo-9b</title></head><body>` +
		`<a href="/library/foo-9b:9b">9b</a>` +
		`<a href="/library/foo-9b:4b">4b</a></body></html>`
	pinned, ok := parseLibraryModelPage(noLatest, "foo-9b", "library/foo-9b")
	if !ok {
		t.Fatal("variant page not parsed")
	}
	if pinned.Name != "foo-9b:4b" {
		t.Errorf("expected pinned variant foo-9b:4b, got %q", pinned.Name)
	}

	// Cloud-only page (no pullable variant) must be rejected.
	cloudPage := `<html><head><title>kimi-k3</title></head><body><a href="/library/kimi-k3:cloud">cloud</a></body></html>`
	if _, ok := parseLibraryModelPage(cloudPage, "kimi-k3", "library/kimi-k3"); ok {
		t.Error("cloud-only model page should be rejected")
	}
	// Title mismatch (soft 404) must be rejected.
	if _, ok := parseLibraryModelPage(testModelPage, "llama3", "library/llama3"); ok {
		t.Error("title mismatch should be rejected")
	}
}
