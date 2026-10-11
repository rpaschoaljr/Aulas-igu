package sanitizer_test

import (
	"testing"

	"radio20/backend/internal/sanitizer"
)

func TestSanitizeText(t *testing.T) {
	tests := []struct {
		name               string
		input              string
		expectedDisplay    string
		expectedNormalized string
	}{
		{
			name:               "Remove leading and trailing spaces",
			input:              "   DJ Paschoal   ",
			expectedDisplay:    "DJ Paschoal",
			expectedNormalized: "dj paschoal",
		},
		{
			name:               "Unescape HTML entities from YouTube",
			input:              "Rock &amp; Roll &#39;Hits&#39; &quot;Live&quot;",
			expectedDisplay:    `Rock & Roll 'Hits' "Live"`,
			expectedNormalized: `rock & roll 'hits' "live"`,
		},
		{
			name:               "Normalize mixed casing for collision check",
			input:              "TeSt tEste testE",
			expectedDisplay:    "TeSt tEste testE",
			expectedNormalized: "test teste teste",
		},
		{
			name:               "Multiple spaces collapsed into single space in normalized",
			input:              "The   Beatles  -   Hey  Jude",
			expectedDisplay:    "The   Beatles  -   Hey  Jude",
			expectedNormalized: "the beatles - hey jude",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			display, normalized := sanitizer.ProcessPair(tt.input)
			if display != tt.expectedDisplay {
				t.Errorf("ProcessPair(%q) display = %q; want %q", tt.input, display, tt.expectedDisplay)
			}
			if normalized != tt.expectedNormalized {
				t.Errorf("ProcessPair(%q) normalized = %q; want %q", tt.input, normalized, tt.expectedNormalized)
			}
		})
	}
}
