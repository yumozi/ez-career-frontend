
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FaRocket, FaUpload } from "react-icons/fa";

export function JobForm() {
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">New Job Application</CardTitle>
        <CardDescription>
          Fill out the details for the job you want to apply to
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input id="jobTitle" placeholder="e.g. Software Engineer" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" placeholder="e.g. Acme Inc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="e.g. New York, NY or Remote" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobType">Job Type</Label>
              <Select>
                <SelectTrigger id="jobType">
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fullTime">Full-time</SelectItem>
                  <SelectItem value="partTime">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Experience Level</Label>
              <Select>
                <SelectTrigger id="experience">
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior Level</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Job Description (URL or Text)</Label>
            <Textarea 
              id="description" 
              placeholder="Paste job description or URL here"
              className="min-h-32"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Documents</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="border rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="useDefaultResume" className="font-normal">Use default resume</Label>
                  <Switch id="useDefaultResume" defaultChecked />
                </div>
                <div className="text-sm text-muted-foreground">
                  <span>John-Person-Resume.pdf</span>
                </div>
              </div>
              
              <div className="border rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="useDefaultCover" className="font-normal">Use default cover letter</Label>
                  <Switch id="useDefaultCover" defaultChecked />
                </div>
                <div className="text-sm text-muted-foreground">
                  <span>John-Person-Cover-Letter.pdf</span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <Label className="text-base mb-2 block">Customize Application</Label>
            <div className="flex items-center space-x-2">
              <Switch id="generate" />
              <Label htmlFor="generate" className="font-normal">Generate customized documents with AI</Label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Let our AI optimize your resume and cover letter for this specific job
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Save Draft</Button>
        <Button className="gap-2">
          <FaRocket className="h-4 w-4" />
          <span>Apply Now</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
