import { TechnicalActivityEnvironment } from '@prisma/client';

/**
 * Pure inference helpers for Hoạt động KTV.
 *
 * Everything in this file is a best-effort ESTIMATE ("ước lượng") derived from
 * branch names and commit messages. The UI must always present these values as
 * estimates, never as ground truth — progressConfidence encodes how weak the
 * signal is (0–100).
 */

export interface EnvironmentResolution {
  environment: TechnicalActivityEnvironment;
  environmentLabel: string;
}

const ENVIRONMENT_LABELS: Record<TechnicalActivityEnvironment, string> = {
  [TechnicalActivityEnvironment.PRODUCTION]: 'Production / Chính thức',
  [TechnicalActivityEnvironment.STAGING]: 'Staging / Demo',
  [TechnicalActivityEnvironment.DEVELOPMENT]: 'Development / Demo',
  [TechnicalActivityEnvironment.DEMO]: 'Demo / Thử nghiệm',
  [TechnicalActivityEnvironment.UNKNOWN]: 'Không xác định',
};

export function environmentLabelFor(
  environment: TechnicalActivityEnvironment,
): string {
  return ENVIRONMENT_LABELS[environment];
}

/**
 * Branch → environment mapping (overridable from the request body):
 * - main / master / production / prod  → PRODUCTION
 * - staging                            → STAGING
 * - development / develop / dev        → DEVELOPMENT
 * - any other branch                   → DEVELOPMENT (feature branches merge
 *   into development first), labelled explicitly as an estimate
 * - empty branch name                  → UNKNOWN
 */
export function resolveEnvironment(
  branchName: string,
  override?: TechnicalActivityEnvironment,
): EnvironmentResolution {
  if (override) {
    return { environment: override, environmentLabel: ENVIRONMENT_LABELS[override] };
  }

  const branch = branchName.trim().toLowerCase();
  if (!branch) {
    return {
      environment: TechnicalActivityEnvironment.UNKNOWN,
      environmentLabel: ENVIRONMENT_LABELS[TechnicalActivityEnvironment.UNKNOWN],
    };
  }

  if (['main', 'master', 'production', 'prod'].includes(branch)) {
    return {
      environment: TechnicalActivityEnvironment.PRODUCTION,
      environmentLabel: ENVIRONMENT_LABELS[TechnicalActivityEnvironment.PRODUCTION],
    };
  }

  if (branch === 'staging') {
    return {
      environment: TechnicalActivityEnvironment.STAGING,
      environmentLabel: ENVIRONMENT_LABELS[TechnicalActivityEnvironment.STAGING],
    };
  }

  if (['development', 'develop', 'dev'].includes(branch)) {
    return {
      environment: TechnicalActivityEnvironment.DEVELOPMENT,
      environmentLabel: ENVIRONMENT_LABELS[TechnicalActivityEnvironment.DEVELOPMENT],
    };
  }

  return {
    environment: TechnicalActivityEnvironment.DEVELOPMENT,
    environmentLabel: 'Development / Nhánh tính năng (ước lượng)',
  };
}

export interface ActivityInference {
  featureName?: string;
  phaseName?: string;
  progressPercent?: number;
  progressConfidence?: number;
}

const TRUNK_BRANCHES = new Set([
  'main',
  'master',
  'production',
  'prod',
  'staging',
  'development',
  'develop',
  'dev',
]);

const BRANCH_TYPE_PREFIX =
  /^(feat|feature|fix|hotfix|bugfix|chore|refactor|release|test|docs|ci|build|perf)\//i;

function humanize(slug: string): string {
  return slug
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** feature/admin-ktv-activity → "Admin Ktv Activity"; trunk branches fall back to the conventional-commit scope. */
export function inferFeatureName(
  branchName: string,
  commitMessage: string,
): string | undefined {
  const branch = branchName.trim();
  if (branch && !TRUNK_BRANCHES.has(branch.toLowerCase())) {
    const withoutType = branch.replace(BRANCH_TYPE_PREFIX, '');
    if (withoutType) {
      return humanize(withoutType);
    }
  }

  // Conventional commit scope: "feat(orders): ..." → "Orders"
  const scopeMatch = commitMessage.match(/^\w+\(([^)]+)\):/);
  if (scopeMatch?.[1]) {
    return humanize(scopeMatch[1]);
  }

  return undefined;
}

interface PhaseRule {
  pattern: RegExp;
  phaseName: string;
  progressPercent: number;
}

// Ordered: first match wins. Percentages are coarse heuristics, not truth.
const PHASE_RULES: PhaseRule[] = [
  { pattern: /\b(complete|completed|final|finish|finished|release|ship)\b/i, phaseName: 'Hoàn thành', progressPercent: 95 },
  { pattern: /\bmerge\b/i, phaseName: 'Tích hợp', progressPercent: 90 },
  { pattern: /\brevert\b/i, phaseName: 'Hoàn tác', progressPercent: 60 },
  { pattern: /\b(init|setup|scaffold|bootstrap)\b/i, phaseName: 'Khởi tạo', progressPercent: 15 },
  { pattern: /\bwip\b/i, phaseName: 'Đang phát triển', progressPercent: 35 },
  { pattern: /\b(test|tests|spec|uat|e2e)\b/i, phaseName: 'Kiểm thử', progressPercent: 85 },
  { pattern: /\brefactor\b/i, phaseName: 'Tái cấu trúc', progressPercent: 70 },
  { pattern: /\b(docs|doc|guide)\b/i, phaseName: 'Tài liệu', progressPercent: 90 },
  { pattern: /\b(fix|hotfix|bugfix|sua loi|sửa lỗi)\b/i, phaseName: 'Sửa lỗi / Hoàn thiện', progressPercent: 75 },
  { pattern: /\b(feat|feature|add|implement|create)\b/i, phaseName: 'Phát triển tính năng', progressPercent: 55 },
];

/**
 * Light keyword inference over branch + commit message. Only used to FILL
 * missing fields — explicit client-provided values always win (handled by the
 * caller). Confidence stays low on purpose.
 */
export function inferActivityContext(input: {
  branchName: string;
  commitMessage: string;
}): ActivityInference {
  const featureName = inferFeatureName(input.branchName, input.commitMessage);

  const haystack = `${input.commitMessage}`;
  const matched = PHASE_RULES.find((rule) => rule.pattern.test(haystack));

  if (matched) {
    return {
      featureName,
      phaseName: matched.phaseName,
      progressPercent: matched.progressPercent,
      progressConfidence: 40,
    };
  }

  return {
    featureName,
    phaseName: 'Đang phát triển',
    progressPercent: 50,
    progressConfidence: 20,
  };
}

export interface BugReference {
  /** 'code' = BUG-{n} (mã thân thiện); 'id' = cuid lấy từ URL /bug-reports/{id} */
  kind: 'code' | 'id';
  value: string;
  /** true khi có từ khóa hoàn tất đứng NGAY TRƯỚC tham chiếu (fixes/closes/resolves/done/xong/hoàn thành) */
  complete: boolean;
}

// Từ khóa hoàn tất phải đứng sát tham chiếu ("fixes BUG-12") — chữ "fix" ở đầu
// conventional commit ("fix(cart): ... BUG-12") KHÔNG kích hoạt DONE, chỉ link.
const BUG_REF_PATTERN =
  /(?:\b(fix(?:es|ed)?|close[sd]?|resolve[sd]?|done|ho[àa]n th[àa]nh|xong)\b[:\s-]{0,8})?(?:\bbug[-_ ]?(\d{1,8})\b|\/bug-reports\/([a-z0-9]{20,40})\b)/gi;

/** Quét commit subject + body tìm tham chiếu Báo cáo lỗi; dedupe, complete=true thắng. */
export function extractBugReferences(
  subject: string,
  body?: string | null,
): BugReference[] {
  const haystack = `${subject}\n${body ?? ''}`;
  const found = new Map<string, BugReference>();

  for (const match of haystack.matchAll(BUG_REF_PATTERN)) {
    const complete = Boolean(match[1]);
    const reference: BugReference = match[2]
      ? { kind: 'code', value: match[2], complete }
      : { kind: 'id', value: match[3], complete };
    const key = `${reference.kind}:${reference.value}`;
    const existing = found.get(key);
    if (!existing || (!existing.complete && complete)) {
      found.set(key, reference);
    }
  }

  return [...found.values()];
}

/**
 * Biên ngày Việt Nam — phép tính thật đã chuyển sang
 * `src/common/utils/vietnam-day.util.ts`, ở đây chỉ xuất lại.
 *
 * Lý do chuyển: `src/common/**` nằm trong `.split/shared-base.manifest` nên tự
 * đồng bộ sang workers, còn tệp `*.helpers.ts` SỐ NHIỀU này thì không khớp
 * manifest và phải mirror tay. Nơi gọi cũ (KTV, bảng xếp hạng video,
 * wallet-reset, bug-reports) giữ nguyên đường nhập, hành vi không đổi.
 */
export {
  VN_UTC_OFFSET_MS,
  startOfVietnamDay,
} from '../../common/utils/vietnam-day.util';
