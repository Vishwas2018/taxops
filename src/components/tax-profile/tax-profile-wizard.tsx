"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveTaxProfileSectionAction } from "@/app/(app)/profile/actions";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatAnswerLabel } from "@/lib/tax-profile/format";
import { TAX_PROFILE_QUESTION_GROUPS, type TaxProfileInput } from "@/lib/validation/tax-profile";
import { QuestionGroupControl } from "./question-group-control";

const QUESTION_STEPS = TAX_PROFILE_QUESTION_GROUPS;
const REVIEW_STEP = QUESTION_STEPS.length;
const COMPLETE_STEP = QUESTION_STEPS.length + 1;

/**
 * Full stepped interview: one question group per step, then a review-and-confirm step, then a
 * completion screen. Every field is skippable - "Next" always works whether or not the current
 * step has an answer, so there's no per-step validation gate to fight through.
 */
export function TaxProfileWizard({
  initialAnswers = {},
  onDone,
}: {
  initialAnswers?: TaxProfileInput;
  onDone?: () => void;
}) {
  const [answers, setAnswers] = useState<TaxProfileInput>(initialAnswers);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function updateAnswer(key: keyof TaxProfileInput, value: unknown) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await saveTaxProfileSectionAction(answers);
      if (result.status === "error") {
        setError(result.message ?? "Could not save your tax profile. Try again.");
        return;
      }
      setStep(COMPLETE_STEP);
    });
  }

  if (step === COMPLETE_STEP) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          Profile saved
        </h1>
        <p className="text-sm text-textSecondary">
          Your answers now organize the tips, checklists, and calculator defaults you see
          elsewhere in TaxOps.
        </p>
        <Disclaimer variant="inline" />
        {onDone && (
          <Button variant="secondary" onClick={onDone}>
            Done
          </Button>
        )}
      </div>
    );
  }

  const stepLabel =
    step === REVIEW_STEP ? "Review your answers" : `Step ${step + 1} of ${REVIEW_STEP}: ${QUESTION_STEPS[step].title}`;

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <p aria-live="polite" className="text-sm font-medium text-textSecondary">
          {stepLabel}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutralSubtle">
          <div
            className="h-full rounded-full bg-accent transition-all duration-200 ease-in-out"
            style={{ width: `${Math.round(((step + 1) / (REVIEW_STEP + 1)) * 100)}%` }}
          />
        </div>
      </div>

      <Card>
        <CardContent>
          {step < REVIEW_STEP ? (
            <fieldset className="space-y-3">
              <legend className="sr-only">{QUESTION_STEPS[step].title}</legend>
              <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
                {QUESTION_STEPS[step].title}
              </h2>
              {QUESTION_STEPS[step].description && (
                <p className="text-sm text-textMuted">{QUESTION_STEPS[step].description}</p>
              )}
              <QuestionGroupControl
                group={QUESTION_STEPS[step]}
                value={answers[QUESTION_STEPS[step].key]}
                onChange={(value) => updateAnswer(QUESTION_STEPS[step].key, value)}
              />
              <p className="text-xs text-textMuted">
                You can skip any question - Next works either way, and you can come back later.
              </p>
            </fieldset>
          ) : (
            <div className="space-y-4">
              <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
                Review your answers
              </h2>
              <dl className="divide-y divide-border rounded-lg border border-border">
                {QUESTION_STEPS.map((group, index) => (
                  <div key={group.key} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <dt className="text-sm font-medium">{group.title}</dt>
                      <dd className="text-sm text-textSecondary">
                        {formatAnswerLabel(group, answers[group.key])}
                      </dd>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setStep(index)}>
                      Edit
                    </Button>
                  </div>
                ))}
              </dl>
              {error && (
                <p role="alert" className="text-sm font-medium text-danger">
                  {error}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Back
        </Button>
        {step < REVIEW_STEP ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)}>
            {step === REVIEW_STEP - 1 ? "Review" : "Next"}
          </Button>
        ) : (
          <Button type="button" onClick={confirm} disabled={isPending} aria-busy={isPending}>
            {isPending ? "Saving…" : "Confirm"}
          </Button>
        )}
      </div>
    </div>
  );
}
