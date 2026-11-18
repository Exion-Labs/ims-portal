"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, ReferenceSequenceView } from "@ims/api-client";

export default function SequencesSettingsPage() {
  const { data: sequences, refetch } = useQuery({
    queryKey: ["settings-sequences"],
    queryFn: () => apiFetch<ReferenceSequenceView[]>("/api/v1/settings/sequences"),
  });

  async function handleUpdate(
    seq: ReferenceSequenceView,
    prefix: string,
    padding: number,
    nextValue: number
  ) {
    await apiFetch(`/api/v1/settings/sequences/${seq.sequenceKey}`, {
      method: "PUT",
      body: JSON.stringify({ prefix, padding, nextValue }),
    });
    refetch();
  }

  return (
    <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-6">
      <h2 className="text-[15px] font-semibold text-[#18181B]">
        Reference Number Sequences
      </h2>
      <p className="mt-0.5 text-[13px] text-[#52525B]">
        Per-tenant atomic document counters incremented using JPA `PESSIMISTIC_WRITE` locks.
      </p>

      <div className="mt-5 divide-y divide-[#E4E4E7] rounded-[8px] border border-[#E4E4E7]">
        {(sequences ?? []).map((seq) => {
          const preview = `${seq.prefix}${String(seq.nextValue).padStart(seq.padding, "0")}`;
          return (
            <div
              key={seq.id}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <div className="font-mono text-[14px] font-semibold text-[#18181B]">
                  {seq.sequenceKey}
                </div>
                <div className="text-[12px] text-[#63636B]">
                  Next generated reference:{" "}
                  <code className="rounded bg-[#EEF2FF] px-1.5 py-0.5 font-mono text-[#1D4ED8]">
                    {preview}
                  </code>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  defaultValue={seq.prefix}
                  onBlur={(e) =>
                    handleUpdate(seq, e.target.value, seq.padding, seq.nextValue)
                  }
                  className="h-8 w-24 rounded-[6px] border border-[#E4E4E7] px-2 font-mono text-[12px]"
                  aria-label={`${seq.sequenceKey} prefix`}
                />
                <input
                  type="number"
                  min={1}
                  max={10}
                  defaultValue={seq.padding}
                  onBlur={(e) =>
                    handleUpdate(seq, seq.prefix, Number(e.target.value), seq.nextValue)
                  }
                  className="h-8 w-20 rounded-[6px] border border-[#E4E4E7] px-2 font-mono text-[12px] text-right tabular-nums"
                  aria-label={`${seq.sequenceKey} padding`}
                />
                <input
                  type="number"
                  min={1}
                  defaultValue={seq.nextValue}
                  onBlur={(e) =>
                    handleUpdate(seq, seq.prefix, seq.padding, Number(e.target.value))
                  }
                  className="h-8 w-24 rounded-[6px] border border-[#E4E4E7] px-2 font-mono text-[12px] text-right tabular-nums"
                  aria-label={`${seq.sequenceKey} next value`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
