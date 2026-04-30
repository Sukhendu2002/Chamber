"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconBrain,
  IconTrendingUp,
} from "@tabler/icons-react";
import { WhatIfScenario, getWhatIfScenarios } from "@/lib/actions/forecasting";

type WhatIfScenariosProps = {
  currency: string;
};

export function WhatIfScenarios({ currency }: WhatIfScenariosProps) {
  const [scenarios, setScenarios] = useState<WhatIfScenario[] | null>(null);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      signDisplay: "always",
    }).format(amount);

  const handleLoad = async () => {
    setLoading(true);
    try {
      const data = await getWhatIfScenarios();
      setScenarios(data);
    } catch (error) {
      console.error("Failed to load scenarios:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconBrain className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">What-If Analysis</h3>
        </div>
        <Button size="sm" variant="outline" onClick={handleLoad} disabled={loading}>
          <IconTrendingUp className="h-3.5 w-3.5 mr-1" />
          {loading ? "Calculating..." : "Run Scenarios"}
        </Button>
      </div>

      {scenarios === null && !loading && (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <IconBrain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Explore different spending scenarios</p>
          <p className="text-xs text-muted-foreground mt-1">
            See how changes in your spending could affect your future balance
          </p>
        </div>
      )}

      {scenarios && scenarios.length === 0 && (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-sm text-muted-foreground">No scenario data available</p>
        </div>
      )}

      {scenarios && scenarios.length > 0 && (
        <div className="space-y-3">
          {scenarios.map((scenario) => (
            <Card key={scenario.name} className="border">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{scenario.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Projected final balance
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(scenario.savingsAtEnd)}
                    </p>
                    <Badge
                      variant={scenario.differenceFromBase >= 0 ? "default" : "destructive"}
                      className="text-[10px] h-5 mt-0.5"
                    >
                      {scenario.differenceFromBase >= 0 ? "+" : ""}
                      {formatCurrency(scenario.differenceFromBase).replace(/^\+?/, "")}
                    </Badge>
                  </div>
                </div>
                {/* Mini trend bar */}
                <div className="mt-3 flex items-end gap-0.5 h-8">
                  {scenario.projectedBalances.map((balance, i) => {
                    const min = Math.min(...scenario.projectedBalances);
                    const max = Math.max(...scenario.projectedBalances);
                    const range = max - min || 1;
                    const height = Math.max(10, ((balance - min) / range) * 100);
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-primary/60"
                        style={{ height: `${height}%`, opacity: 0.4 + (i / scenario.projectedBalances.length) * 0.6 }}
                        title={`Month ${i + 1}: ${new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(balance)}`}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
