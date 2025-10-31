import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";

interface ResumeUploadProps {
  userId: string;
}

const ResumeUpload = ({ userId }: ResumeUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!validTypes.includes(file.type)) {
        toast.error("Only PDF and Word documents are allowed");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      console.log("Uploading file:", {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        filePath,
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      console.log("Upload response:", { uploadData, uploadError });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: dbData, error: dbError } = await supabase.from("resumes").insert({
        user_id: userId,
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
      });

      console.log("Database insert response:", { dbData, dbError });

      if (dbError) {
        console.error("Database insert error:", dbError);
        // Try to clean up the uploaded file
        await supabase.storage.from("resumes").remove([filePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      toast.success("Resume uploaded successfully!");
      setSelectedFile(null);
      
      const fileInput = document.getElementById("resume-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      window.dispatchEvent(new Event("resume-uploaded"));
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage = error.message || error.toString() || "Failed to upload resume";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Resume
        </CardTitle>
        <CardDescription>
          Upload your resume securely (PDF or Word, max 10MB)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="resume-upload"
              className="flex-1 cursor-pointer"
            >
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-muted-foreground">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a file
                    </p>
                  </div>
                )}
              </div>
              <input
                id="resume-upload"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
              />
            </label>
          </div>

          {selectedFile && (
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button
                onClick={() => {
                  setSelectedFile(null);
                  const fileInput = document.getElementById("resume-upload") as HTMLInputElement;
                  if (fileInput) fileInput.value = "";
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResumeUpload;
