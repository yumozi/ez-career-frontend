
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ApplicationStage {
  id: string;
  name: string;
  count: number;
  color: string;
}

interface ApplicationStatusProps {
  stages: ApplicationStage[];
  totalApplications: number;
}

export function ApplicationStatus({ stages, totalApplications }: ApplicationStatusProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Application Status</CardTitle>
        <CardDescription>Track your application progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage) => {
          const percentage = Math.round((stage.count / totalApplications) * 100);
          return (
            <div key={stage.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full`} style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-medium">{stage.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {stage.count} ({percentage}%)
                </span>
              </div>
              <Progress value={percentage} className="h-2" style={{ 
                "--progress-background": stage.color 
              } as React.CSSProperties} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
