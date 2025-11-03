import React from "react";

const fmtDT = (s) => {
  const d = new Date(s);
  if (Number.isNaN(d.valueOf())) return "—";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const Chip = ({ children, tone = "gray" }) => {
  const tones = {
    gray:  "bg-gray-100 text-gray-700",
    dark:  "bg-black text-white",
    green: "bg-emerald-100 text-emerald-700",
    red:   "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
};

const Kbd = ({ children }) => (
  <kbd className="px-2 py-1 rounded-lg bg-gray-100 text-[11px]">{children}</kbd>
);

export default function AttendanceTable({ rows = [], loading = false }) {
  if (loading) {
    return (
      <div className="rounded-3xl border p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-gray-100/70" />
          ))}
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-3xl border p-10 grid place-items-center text-center gap-3">
        <div className="text-5xl">🗓️</div>
        <div className="text-lg font-semibold">No attendance in this range</div>
        <div className="text-gray-600 text-sm">
          Try a wider date range or remove the employee filter. Tip: use the chips above
          (<Kbd>Today</Kbd>, <Kbd>Yesterday</Kbd>, <Kbd>Last 7 days</Kbd>).
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border overflow-hidden bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur">
        <div className="grid grid-cols-12 px-5 py-3 text-[12px] font-semibold tracking-wide text-gray-700">
          <div className="col-span-3">Employee</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Check-in</div>
          <div className="col-span-2">Check-out</div>
          <div className="col-span-1 text-center">Hours</div>
          <div className="col-span-2 text-right">Sites</div>
        </div>
      </div>

      <ul className="divide-y">
        {rows.map((r, idx) => {
          const inTime  = fmtDT(r.checkInAt);
          const outTime = fmtDT(r.checkOutAt);
          const hours   = typeof r.hours === "number" ? r.hours.toFixed(2) : "—";
          const zebra   = idx % 2 ? "bg-gray-50/40" : "bg-white";

          return (
            <li key={r.id} className={`${zebra} px-5 py-4 hover:bg-gray-50/80 transition-colors`}>
              {/* Row */}
              <div className="grid grid-cols-12 items-center gap-y-2">
                {/* Employee */}
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                  <div className="hidden sm:grid place-items-center w-9 h-9 rounded-2xl bg-gray-100 text-gray-600 text-sm">
                    {String(r.employeeName || "")
                      .split(" ")
                      .map((n) => n[0] || "")
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "👤"}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold truncate">{r.employeeName || r.employeeId}</div>
                    {r.employeeEmail && <div className="text-[12px] text-gray-500 truncate">{r.employeeEmail}</div>}
                  </div>
                </div>

                {/* Date */}
                <div className="col-span-2">
                  <div className="font-medium">{r.date}</div>
                  <div className="text-[12px] text-gray-500">{r.weekday}</div>
                </div>

                {/* Check-in */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Chip tone="gray">{inTime}</Chip>
                    {(r.checkInSource || r.checkInSiteId) && (
                      <span className="text-[12px] text-gray-500">
                        • {r.checkInSource || "—"}{r.checkInSiteId ? ` · ${r.checkInSiteId}` : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Check-out */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Chip tone="gray">{outTime}</Chip>
                    {(r.checkOutSource || r.checkOutSiteId) && (
                      <span className="text-[12px] text-gray-500">
                        • {r.checkOutSource || "—"}{r.checkOutSiteId ? ` · ${r.checkOutSiteId}` : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Hours */}
                <div className="col-span-1 grid place-items-center">
                  <span className="inline-flex items-center rounded-xl bg-gray-900/90 text-white px-2.5 py-1 text-sm font-semibold">
                    {hours}
                  </span>
                </div>

                {/* Sites */}
                <div className="col-span-2">
                  <div className="flex justify-end gap-2">
                    {r.checkInSiteId  && <Chip>IN · {r.checkInSiteId}</Chip>}
                    {r.checkOutSiteId && <Chip>OUT · {r.checkOutSiteId}</Chip>}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {(r.checkInNote || r.checkOutNote) && (
                <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {r.checkInNote && (
                      <div>
                        <span className="font-medium text-gray-600">IN:</span>{" "}
                        <span className="whitespace-pre-wrap">{r.checkInNote}</span>
                      </div>
                    )}
                    {r.checkOutNote && (
                      <div>
                        <span className="font-medium text-gray-600">OUT:</span>{" "}
                        <span className="whitespace-pre-wrap">{r.checkOutNote}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
