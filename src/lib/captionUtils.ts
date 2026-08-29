export function formatHashtags(input: string): string {
  if (!input || !input.trim()) return "";
  const parts = input.trim().split(/[\s,]+/);
  const formatted = parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith("#") ? p : `#${p}`));
  return Array.from(new Set(formatted)).join(" ");
}

export function generateSmartCaption(
  title: string = "",
  extraTag: string = "",
  customHashtags: string = "",
  hashtagOption: string = "custom_or_default"
): string {
  const cleanTitle = (title || "").trim();
  const hasArabic = /[\u0600-\u06FF]/.test(cleanTitle);
  const extra = extraTag ? ` ${extraTag.trim()}` : "";
  const formattedCustom = formatHashtags(customHashtags);

  let defaultTags = "";
  if (hasArabic) {
    defaultTags = "#fyp #viral #trending #explore #ترند #فيديو";
  } else {
    defaultTags = "#fyp #viral #trending #foryou #shorts #video";
  }

  let finalHashtags = "";

  if (hashtagOption === "none") {
    finalHashtags = "";
  } else if (hashtagOption === "custom_only") {
    finalHashtags = formattedCustom;
  } else if (hashtagOption === "append") {
    const combined = [defaultTags, formattedCustom].filter(Boolean).join(" ");
    finalHashtags = formatHashtags(combined);
  } else {
    // "custom_or_default"
    finalHashtags = formattedCustom ? formattedCustom : defaultTags;
  }

  if (extra) {
    finalHashtags = finalHashtags ? `${finalHashtags}${extra}` : extra.trim();
  }

  if (!cleanTitle) {
    return finalHashtags || defaultTags;
  }

  return finalHashtags ? `${cleanTitle}\n\n${finalHashtags}` : cleanTitle;
}

