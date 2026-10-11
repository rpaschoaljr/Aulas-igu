package duration

import (
	"regexp"
	"strconv"
)

var isoDurationRegex = regexp.MustCompile(`^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$`)

// ParseISO8601Duration converte uma string ISO 8601 (ex: "PT3M30S", "PT1H2M15S") em total de segundos.
func ParseISO8601Duration(iso string) int {
	if iso == "" || iso == "P" || iso == "PT" {
		return 0
	}

	matches := isoDurationRegex.FindStringSubmatch(iso)
	if matches == nil {
		return 0
	}

	days := parseDurationPart(matches[1])
	hours := parseDurationPart(matches[2])
	minutes := parseDurationPart(matches[3])
	seconds := parseDurationPart(matches[4])

	return days*86400 + hours*3600 + minutes*60 + seconds
}

func parseDurationPart(s string) int {
	if s == "" {
		return 0
	}
	val, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return val
}
