
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Application {
  id: string;
  companyName: string;
  position: string;
  date: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected';
  logo?: string;
}

const statusStyles = {
  applied: { bg: "bg-blue-100 text-blue-800", text: "Applied" },
  interview: { bg: "bg-amber-100 text-amber-800", text: "Interview" },
  offer: { bg: "bg-success-100 text-success-800", text: "Offer" },
  rejected: { bg: "bg-destructive/10 text-destructive", text: "Rejected" },
};

interface RecentApplicationsProps {
  applications: Application[];
}

export function RecentApplications({ applications }: RecentApplicationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Applications</CardTitle>
        <CardDescription>Your latest job applications</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {applications.map((app) => (
            <div key={app.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                  {app.logo ? (
                    <img src={app.logo} alt={app.companyName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-muted-foreground">
                      {app.companyName.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{app.position}</p>
                  <p className="text-sm text-muted-foreground">{app.companyName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:inline">{app.date}</span>
                <Badge variant="outline" className={`text-xs ${statusStyles[app.status].bg}`}>
                  {statusStyles[app.status].text}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
