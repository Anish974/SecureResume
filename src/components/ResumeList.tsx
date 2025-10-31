import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Download, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Resume {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

interface ResumeListProps {
  userId: string;
}

const ResumeList = ({ userId }: ResumeListProps) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResumes = async () => {
    try {
      console.log("Fetching resumes for user:", userId);
      
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false });

      console.log("Fetch resumes response:", { data, error });

      if (error) {
        console.error("Fetch resumes error:", error);
        throw error;
      }
      
      setResumes(data || []);
    } catch (error: any) {
      console.error("Failed to load resumes:", error);
      toast.error(`Failed to load resumes: ${error.message || "Network error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();

    const handleResumeUploaded = () => {
      fetchResumes();
    };

    window.addEventListener("resume-uploaded", handleResumeUploaded);
    return () => window.removeEventListener("resume-uploaded", handleResumeUploaded);
  }, [userId]);

  const handleDownload = async (resume: Resume) => {
    try {
      console.log("Downloading resume:", resume.file_path);
      
      const { data, error } = await supabase.storage
        .from("resumes")
        .download(resume.file_path);

      console.log("Download response:", { data, error });

      if (error) {
        console.error("Download error:", error);
        throw error;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = resume.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Resume downloaded");
    } catch (error: any) {
      console.error("Download failed:", error);
      toast.error(`Failed to download: ${error.message || "Network error"}`);
    }
  };

  const handleDelete = async (resume: Resume) => {
    if (!confirm(`Are you sure you want to delete "${resume.file_name}"?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("resumes")
        .remove([resume.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resume.id);

      if (dbError) throw dbError;

      setResumes(resumes.filter((r) => r.id !== resume.id));
      toast.success("Resume deleted");
    } catch (error: any) {
      toast.error("Failed to delete resume");
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Your Resumes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Your Resumes</CardTitle>
        <CardDescription>
          {resumes.length === 0
            ? "No resumes uploaded yet"
            : `${resumes.length} resume${resumes.length === 1 ? "" : "s"} stored securely`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {resumes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Upload your first resume to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{resume.file_name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{(resume.file_size / 1024 / 1024).toFixed(2)} MB</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(resume.uploaded_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(resume)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(resume)}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResumeList;
