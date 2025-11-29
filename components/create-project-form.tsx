"use client";

import { useState, useRef, DragEvent } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { validateFile } from "@/lib/supabase-storage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CreateProjectFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateProjectForm({
  onClose,
  onSuccess,
}: CreateProjectFormProps) {
  const { user } = usePrivy();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = (newFiles: File[]) => {
    // Validate files
    const validFiles = newFiles.filter((file) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return false;
      }
      return true;
    });

    // Limit to 5 files total
    const remainingSlots = 5 - files.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);

    if (filesToAdd.length === 0) return;

    setFiles((prev) => [...prev, ...filesToAdd]);

    // Create previews
    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.wallet?.address) return;

    setUploading(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append("title", title);
      formData.append("summary", summary);
      formData.append("wallet_address", user.wallet.address.toLowerCase());

      files.forEach((file) => {
        formData.append("files", file);
      });

      // Submit to API
      const response = await fetch("/api/createProject", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      // Success!
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Share your project and get valuable feedback from the community
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Project Title
              <span className="text-destructive ml-1">*</span>
            </label>
            <Input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
              placeholder="Enter project title..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {title.length}/100 characters
            </p>
          </div>

          {/* Summary */}
          <div>
            <label htmlFor="summary" className="block text-sm font-medium mb-2">
              Project Summary
              <span className="text-destructive ml-1">*</span>
            </label>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              rows={6}
              maxLength={1000}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Describe your project in detail..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.length}/1000 characters
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Attachments{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border/50 bg-background/20 hover:bg-background/50 hover:border-border"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />

              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Drop photos here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF, WebP up to 10MB • Max 5 files
              </p>
            </div>

            {/* Preview Grid */}
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-border/50 bg-background/50"
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="absolute top-2 right-2 rounded-full bg-destructive p-1.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              disabled={uploading}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading || !title || !summary}
              className="flex-1 gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
