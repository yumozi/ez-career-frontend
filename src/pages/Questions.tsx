import React, { useState, useEffect } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { FaSave } from 'react-icons/fa';
import { Skeleton } from "@/components/ui/skeleton";
import { PostgrestError } from '@supabase/supabase-js';

// Define a type for questions fetched from Supabase
interface Question {
  id: string; // Assuming UUID from Supabase
  question_text: string;
  created_at: string;
  // Add other properties like order, category, etc. if needed
}

interface UserAnswer {
  user_id: string;
  question_id: string;
  answer_text: string;
}

const Questions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true); // Loading state for questions
  const [isSaving, setIsSaving] = useState(false); // Separate saving state

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoadingQuestions(true);
      try {
        // Fetch Questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: true }); // Example ordering

        if (questionsError) throw questionsError;
        if (questionsData) {
          setQuestions(questionsData);
        }

        // Fetch Existing Answers
        const { data: answersData, error: answersError } = await supabase
          .from('user_answers')
          .select('question_id, answer_text')
          .eq('user_id', user.id);

        if (answersError) throw answersError;
        if (answersData) {
          const loadedAnswers = answersData.reduce((acc, answer) => {
            acc[answer.question_id] = answer.answer_text;
            return acc;
          }, {} as { [key: string]: string });
          setAnswers(loadedAnswers);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Questions",
          description: "Could not load questions or answers. Please try refreshing.",
        });
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchData();
  }, [user, toast]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSaveAnswers = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "Please log in to save answers." });
      return;
    }
    setIsSaving(true);

    try {
      const answersToSubmit = questions
        .filter(q => answers[q.id] !== undefined && answers[q.id].trim() !== '') // Only submit questions that have a non-empty answer provided
        .map(q => ({
          user_id: user.id,
          question_id: q.id,
          answer_text: answers[q.id].trim(), // Trim whitespace
        }));

      if (answersToSubmit.length === 0) {
        toast({ title: "No Changes", description: "No new or modified non-empty answers to save." });
        setIsSaving(false);
        return;
      }

      console.log('Submitting answers:', answersToSubmit);

      // --- Call Backend API to Save Answers --- 
      const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000'; // Use env var or default
      const submitPromises = answersToSubmit.map(answerData => 
        fetch(`${backendUrl}/submit-answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add Authorization header if needed
          },
          body: JSON.stringify(answerData),
        }).then(async (response) => {
          const responseBody = await response.json(); // Always try to parse JSON
          if (!response.ok) {
            // Throw an error object including details from the response body
            throw {
              status: response.status,
              message: responseBody?.detail || responseBody?.message || response.statusText,
              question_id: answerData.question_id, // Include question_id for context
            };
          }
          return { ...responseBody, question_id: answerData.question_id }; // Return success body + context
        })
      );

      // Wait for all requests to settle (either succeed or fail)
      const results = await Promise.allSettled(submitPromises);
      
      let successfulSaves = 0;
      let failedSaves: { question_id: string; message: string }[] = [];

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          // Check if the backend explicitly reported success
          if (result.value.success) {
             successfulSaves++;
          } else {
            // Backend reported failure even with a 2xx status
            failedSaves.push({ 
              question_id: result.value.question_id, 
              message: result.value.message || 'Backend reported save failed.' 
            });
          }
        } else { // status === 'rejected'
          // Handle network errors or non-2xx responses
          failedSaves.push({ 
            question_id: result.reason?.question_id || 'unknown',
            message: result.reason?.message || 'Network error or server responded with an error.'
          });
          console.error(`Failed to save answer for question ${result.reason?.question_id}:`, result.reason);
        }
      });

      // --- Handle results --- 
      if (failedSaves.length > 0) {
        // Show a summary toast if any failed
        toast({
          variant: "destructive",
          title: `Save Partially Failed (${failedSaves.length}/${answersToSubmit.length})`,
          description: `Could not save answers for ${failedSaves.length} question(s). Check console for details. First error: ${failedSaves[0].message}`,
        });
      } else if (successfulSaves > 0) {
        // Show success only if all submitted answers were saved successfully
         toast({
          title: "Answers Saved",
          description: `${successfulSaves} answer(s) have been successfully saved and processed.`,
        });
      } else {
         // This case might happen if all saves reported success=false from backend
         toast({
          variant: "default",
          title: "Save Completed",
          description: "Processing finished, but the backend reported issues saving some answers. Check logs.",
        });
      }
      
    } catch (error) {
      // Catch any unexpected errors during the process (e.g., preparing data)
      // Errors during fetch are caught by Promise.allSettled rejection handling
      console.error("Unexpected error in handleSaveAnswers:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "An unexpected error occurred while trying to save answers.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 pb-10">
            <div className="container mt-8 px-4 sm:px-6">
              <div className="flex items-center justify-between mb-6">
                 <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
                 <Button
                   onClick={handleSaveAnswers}
                   disabled={isSaving || isLoadingQuestions || questions.length === 0 } // Removed isGeneratingEmbeddings
                 >
                   <FaSave className="mr-2 h-4 w-4" />
                   {isSaving ? 'Saving...' : 'Save Answers'}
                 </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Fill out your responses</CardTitle>
                  <CardDescription>Please answer the following questions to help us understand your preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingQuestions ? (
                    // Loading Skeleton
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ))
                  ) : questions.length === 0 ? (
                    <p className="text-muted-foreground">No questions available at the moment.</p>
                  ) : (
                    questions.map((question) => (
                      <div key={question.id} className="space-y-2">
                        <Label htmlFor={`question-${question.id}`}>{question.question_text}</Label>
                        <Textarea
                          id={`question-${question.id}`}
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          placeholder="Your answer..."
                          rows={3}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Questions; 