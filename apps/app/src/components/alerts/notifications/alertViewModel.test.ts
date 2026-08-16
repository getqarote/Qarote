import { describe, expect, it } from "vitest";

import {
  type RabbitMQAlert,
  RabbitMQAlertSeverity,
} from "@/lib/api/alertTypes";

import {
  activeAlertToVM,
  activeCount,
  activeCountsBySeverity,
  type AlertVM,
  filterAndSort,
  groupBySeverity,
  type ResolvedAlertRow,
  resolvedAlertToVM,
} from "./alertViewModel";

function active(partial: Partial<RabbitMQAlert>): RabbitMQAlert {
  return {
    id: "a",
    serverId: "s",
    serverName: "AWS",
    severity: RabbitMQAlertSeverity.HIGH,
    category: "queue" as RabbitMQAlert["category"],
    title: "t",
    description: "d",
    details: {},
    timestamp: "2026-06-14T10:00:00.000Z",
    resolved: false,
    source: { type: "queue", name: "orders.incoming" },
    ...partial,
  } as RabbitMQAlert;
}

function vm(partial: Partial<AlertVM>): AlertVM {
  return {
    id: "x",
    severity: RabbitMQAlertSeverity.LOW,
    title: "t",
    description: "d",
    resource: "—",
    serverName: "AWS",
    vhost: "/",
    status: "active",
    firstSeen: "2026-06-14T10:00:00.000Z",
    details: {},
    ...partial,
  };
}

describe("activeAlertToVM", () => {
  it("maps an ACTIVE alert with its resource", () => {
    const result = activeAlertToVM(active({ status: "ACTIVE" }));
    expect(result.status).toBe("active");
    expect(result.resource).toBe("orders.incoming");
  });

  it("maps an ACKNOWLEDGED alert to ack status", () => {
    expect(activeAlertToVM(active({ status: "ACKNOWLEDGED" })).status).toBe(
      "ack"
    );
  });

  it("falls back to a dash when there is no source name", () => {
    const result = activeAlertToVM(
      active({ source: { type: "cluster", name: "" } })
    );
    expect(result.resource).toBe("—");
  });
});

describe("resolvedAlertToVM", () => {
  it("maps a resolved row and inherits the context server name", () => {
    const row: ResolvedAlertRow = {
      id: "r1",
      title: "t",
      description: "d",
      severity: "MEDIUM",
      firstSeenAt: "2026-06-14T09:00:00.000Z",
      resolvedAt: "2026-06-14T09:30:00.000Z",
      duration: 1_800_000,
    };
    const result = resolvedAlertToVM(row, "Staging");
    expect(result.status).toBe("resolved");
    expect(result.serverName).toBe("Staging");
    expect(result.durationMs).toBe(1_800_000);
    expect(result.severity).toBe(RabbitMQAlertSeverity.MEDIUM);
  });

  it("coerces an unknown severity string to INFO", () => {
    const row: ResolvedAlertRow = {
      id: "r2",
      title: "t",
      description: "d",
      severity: "BOGUS",
      firstSeenAt: "2026-06-14T09:00:00.000Z",
      resolvedAt: "2026-06-14T09:30:00.000Z",
    };
    expect(resolvedAlertToVM(row, "S").severity).toBe(
      RabbitMQAlertSeverity.INFO
    );
  });
});

describe("activeCountsBySeverity / activeCount", () => {
  it("counts only non-resolved alerts per severity", () => {
    const list = [
      vm({ severity: RabbitMQAlertSeverity.CRITICAL, status: "active" }),
      vm({ severity: RabbitMQAlertSeverity.CRITICAL, status: "resolved" }),
      vm({ severity: RabbitMQAlertSeverity.HIGH, status: "ack" }),
    ];
    const counts = activeCountsBySeverity(list);
    expect(counts[RabbitMQAlertSeverity.CRITICAL]).toBe(1);
    expect(counts[RabbitMQAlertSeverity.HIGH]).toBe(1);
    expect(activeCount(list)).toBe(2);
  });
});

describe("filterAndSort", () => {
  const list = [
    vm({ id: "low", severity: RabbitMQAlertSeverity.LOW, status: "active" }),
    vm({
      id: "crit",
      severity: RabbitMQAlertSeverity.CRITICAL,
      status: "active",
    }),
    vm({ id: "res", severity: RabbitMQAlertSeverity.HIGH, status: "resolved" }),
  ];

  it("hides resolved alerts when showResolved is off", () => {
    const out = filterAndSort(list, { showResolved: false, severity: "all" });
    expect(out.map((a) => a.id)).toEqual(["crit", "low"]);
  });

  it("includes resolved alerts when showResolved is on, sorted by severity", () => {
    const out = filterAndSort(list, { showResolved: true, severity: "all" });
    expect(out.map((a) => a.id)).toEqual(["crit", "res", "low"]);
  });

  it("filters to a single severity", () => {
    const out = filterAndSort(list, {
      showResolved: true,
      severity: RabbitMQAlertSeverity.CRITICAL,
    });
    expect(out.map((a) => a.id)).toEqual(["crit"]);
  });

  it("orders newest-first within the same severity", () => {
    const same = [
      vm({
        id: "older",
        severity: RabbitMQAlertSeverity.HIGH,
        firstSeen: "2026-06-14T08:00:00.000Z",
      }),
      vm({
        id: "newer",
        severity: RabbitMQAlertSeverity.HIGH,
        firstSeen: "2026-06-14T12:00:00.000Z",
      }),
    ];
    const out = filterAndSort(same, { showResolved: false, severity: "all" });
    expect(out.map((a) => a.id)).toEqual(["newer", "older"]);
  });
});

describe("groupBySeverity", () => {
  it("groups in severity order", () => {
    const sorted = filterAndSort(
      [
        vm({ id: "c", severity: RabbitMQAlertSeverity.CRITICAL }),
        vm({ id: "m", severity: RabbitMQAlertSeverity.MEDIUM }),
        vm({ id: "c2", severity: RabbitMQAlertSeverity.CRITICAL }),
      ],
      { showResolved: false, severity: "all" }
    );
    const groups = groupBySeverity(sorted);
    expect(groups.map(([sev]) => sev)).toEqual([
      RabbitMQAlertSeverity.CRITICAL,
      RabbitMQAlertSeverity.MEDIUM,
    ]);
    expect(groups[0][1].map((a) => a.id)).toEqual(["c", "c2"]);
  });
});
