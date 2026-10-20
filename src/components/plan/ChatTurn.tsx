import { describeChange } from "@/lib/domain/format";
import type { Plan, PlanChange } from "@/lib/domain/schema";
import styles from "./CoPlanner.module.css";
import type { Outcome, Turn } from "./useCoPlannerChat";

const OUTCOME_TEXT = {
  applied: () => "Applied. Your plan is updated.",
  dismissed: () => "Dismissed.",
  failed: (reason: string) => `Couldn't apply: ${reason}`,
};

function OutcomeLine({ outcome }: { outcome: Outcome }) {
  const text =
    outcome.kind === "failed" ? OUTCOME_TEXT.failed(outcome.reason) : OUTCOME_TEXT[outcome.kind]();
  return (
    <p className={styles.outcome} data-ok={outcome.kind === "applied" ? "" : undefined}>
      {text}
    </p>
  );
}

interface ProposalProps {
  changes: PlanChange[];
  plan: Plan;
  outcome?: Outcome;
  onApply: () => void;
  onDismiss: () => void;
}

/** Proposed plan changes in plain words, applied only when the person approves. */
function Proposal({ changes, plan, outcome, onApply, onDismiss }: ProposalProps) {
  return (
    <div className={styles.proposal}>
      <ul>
        {changes.map((change, i) => (
          <li key={i}>{describeChange(change, plan)}</li>
        ))}
      </ul>
      {outcome ? (
        <OutcomeLine outcome={outcome} />
      ) : (
        <div className={styles.proposalActions}>
          <button type="button" className="btn btn-primary btn-small" onClick={onApply}>
            Apply {changes.length === 1 ? "change" : `${changes.length} changes`}
          </button>
          <button type="button" className="btn btn-outline btn-small" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

interface Props {
  turn: Turn;
  plan: Plan;
  onApply: (changes: PlanChange[]) => void;
  onDismiss: () => void;
}

/** One message in the conversation, with any changes it proposes. */
export function ChatTurn({ turn, plan, onApply, onDismiss }: Props) {
  const { changes } = turn;
  return (
    <div className={turn.role === "user" ? styles.you : styles.them}>
      <p>{turn.text}</p>
      {changes && changes.length > 0 && (
        <Proposal
          changes={changes}
          plan={plan}
          outcome={turn.outcome}
          onApply={() => onApply(changes)}
          onDismiss={onDismiss}
        />
      )}
    </div>
  );
}
