/** Pure, dependency-free helpers for lead ingestion, dedupe and enrichment. */

export const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "proton.me",
  "aol.com",
  "gmx.com",
  "live.com",
];

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const normalizePhone = (value?: string | null) =>
  value ? value.replace(/[^0-9]/g, "") || null : null;

export function companyDomainFromEmail(email: string): string | null {
  const domain = normalizeEmail(email).split("@")[1] ?? null;
  if (!domain) return null;
  return FREE_EMAIL_DOMAINS.includes(domain) ? null : domain;
}

const INDUSTRY_HINTS: [RegExp, string][] = [
  [/bank|capital|fintech|invest|pay|finance|insur/i, "Financial Services"],
  [/health|clinic|med|pharma|care|bio/i, "Healthcare"],
  [/shop|store|retail|commerce|market/i, "Retail & E-commerce"],
  [/school|edu|academy|learn|university|college/i, "Education"],
  [/law|legal|attorney|counsel/i, "Legal"],
  [/travel|hotel|tour|flight|booking/i, "Travel & Hospitality"],
  [/build|construct|estate|property|realty/i, "Real Estate & Construction"],
  [/logistic|freight|ship|transport|fleet/i, "Logistics"],
  [/energy|solar|power|electric|green/i, "Energy",],
  [/media|studio|agency|creative|design|brand/i, "Media & Agencies"],
  [/manufact|industr|factory|steel|machin/i, "Manufacturing"],
  [/soft|tech|cloud|data|ai|labs|dev|app|digital|io$|\.io$/i, "Technology"],
];

/** Heuristic industry classification from company name + domain. */
export function guessIndustry(company?: string | null, domain?: string | null): string | null {
  const haystack = `${company ?? ""} ${domain ?? ""}`.trim();
  if (!haystack) return null;
  for (const [pattern, industry] of INDUSTRY_HINTS) {
    if (pattern.test(haystack)) return industry;
  }
  return null;
}

const SIZE_BUCKETS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] as const;

/** Maps free-form size input onto the canonical buckets used by the scoring engine. */
export function normalizeCompanySize(value?: string | null): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  if ((SIZE_BUCKETS as readonly string[]).includes(raw)) return raw;
  if (/enterprise|5000|10000/i.test(raw)) return "1000+";
  const n = Number(raw.replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n === 0) return raw.slice(0, 60);
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 500) return "201-500";
  if (n <= 1000) return "501-1000";
  return "1000+";
}

export interface EnrichmentResult {
  companyDomain: string | null;
  industry: string | null;
  companySize: string | null;
  emailQuality: "business" | "free";
  enrichment: Record<string, unknown>;
}

/** Derives firmographic hints from the data we already hold — no external calls. */
export function enrichLead(input: {
  email: string;
  company?: string | null;
  companySize?: string | null;
  linkedinUrl?: string | null;
}): EnrichmentResult {
  const domain = companyDomainFromEmail(input.email);
  const industry = guessIndustry(input.company, domain);
  const companySize = normalizeCompanySize(input.companySize);
  const emailQuality = domain ? "business" : "free";

  return {
    companyDomain: domain,
    industry,
    companySize,
    emailQuality,
    enrichment: {
      email_quality: emailQuality,
      derived_domain: domain,
      derived_industry: industry,
      website: domain ? `https://${domain}` : null,
      linkedin_url: input.linkedinUrl ?? null,
      enriched_by: "heuristic_v1",
    },
  };
}

/** Minimal RFC4180-ish CSV parser (handles quotes, escaped quotes and CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const HEADER_ALIASES: Record<string, string> = {
  "first name": "firstName",
  firstname: "firstName",
  "given name": "firstName",
  "last name": "lastName",
  lastname: "lastName",
  surname: "lastName",
  "full name": "fullName",
  name: "fullName",
  email: "email",
  "email address": "email",
  "work email": "email",
  phone: "phone",
  "phone number": "phone",
  company: "company",
  "company name": "company",
  organization: "company",
  account: "company",
  "company size": "companySize",
  size: "companySize",
  employees: "companySize",
  title: "jobTitle",
  "job title": "jobTitle",
  role: "jobTitle",
  country: "country",
  linkedin: "linkedinUrl",
  "linkedin url": "linkedinUrl",
  notes: "notes",
  note: "notes",
  comments: "notes",
};

/** Turns a parsed CSV grid into records keyed by canonical field names. */
export function mapCsvRows(grid: string[][]): Record<string, string>[] {
  const [header, ...body] = grid;
  if (!header) return [];
  const keys = header.map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim());
  return body.map((cells) => {
    const record: Record<string, string> = {};
    keys.forEach((key, index) => {
      const value = (cells[index] ?? "").trim();
      if (value) record[key] = value;
    });
    if (record["fullName"] && !record["firstName"]) {
      const parts = record["fullName"].split(/\s+/);
      record["firstName"] = parts[0] ?? "";
      if (parts.length > 1) record["lastName"] = parts.slice(1).join(" ");
    }
    return record;
  });
}
