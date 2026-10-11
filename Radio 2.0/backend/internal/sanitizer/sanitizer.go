package sanitizer

import (
	"html"
	"regexp"
	"strings"
)

var multipleSpacesRegex = regexp.MustCompile(`\s+`)

// Normalize returns a lowercase, trimmed and whitespace-collapsed string for unique checks.
func Normalize(s string) string {
	unescaped := html.UnescapeString(s)
	trimmed := strings.TrimSpace(unescaped)
	lowered := strings.ToLower(trimmed)
	return multipleSpacesRegex.ReplaceAllString(lowered, " ")
}

// CleanDisplay returns the unescaped, trimmed string preserving casing for presentation.
func CleanDisplay(s string) string {
	unescaped := html.UnescapeString(s)
	return strings.TrimSpace(unescaped)
}

// ProcessPair generates both display and normalized values for database dual-column pattern.
func ProcessPair(input string) (display string, normalized string) {
	display = CleanDisplay(input)
	normalized = Normalize(input)
	return display, normalized
}
