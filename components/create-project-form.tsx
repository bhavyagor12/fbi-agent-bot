"use client";

import { useState, useRef, DragEvent, useEffect } from "react";
import { useUser } from "@/components/user-provider";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Upload, Image as ImageIcon, Loader2, Info } from "lucide-react";
import { validateFile } from "@/lib/supabase-storage";
import { getUserByWallet, getUserByEmail } from "@/lib/supabase";
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
  const { user } = usePrivy(); // Keep privy user for fallback if needed
  const { user: dbUser, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [features, setFeatures] = useState("");
  const [whatToTest, setWhatToTest] = useState("");
  const [productLink, setProductLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [walletAddress, setWalletAddress] = useState<string>("");

  // Check profile completeness on mount
  useEffect(() => {
    if (userLoading) return;

    if (dbUser) {
      setWalletAddress(dbUser.wallet_address || "");

      const missing: string[] = [];
      if (!dbUser.username) missing.push("Telegram username");
      if (!dbUser.first_name) missing.push("First name");
      if (!dbUser.last_name) missing.push("Last name");

      const hasIdentity = !!dbUser.wallet_address || !!dbUser.email;
      if (!hasIdentity) missing.push("Wallet address or Email");

      setMissingFields(missing);
      setProfileComplete(missing.length === 0);
    } else {
      setProfileComplete(false);
      setMissingFields(["Profile not set up"]);
    }
  }, [dbUser, userLoading]);

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

    // If profile is incomplete, redirect to settings
    // Check if we have wallet OR email
    const hasIdentity = walletAddress || (user?.google?.email || user?.email?.address);
    if (!hasIdentity || !profileComplete) {
      handleGoToSettings();
      return;
    }

    setUploading(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append("title", title);
      formData.append("intro", intro);
      formData.append("features", features);
      formData.append("what_to_test", whatToTest);
      formData.append("product_link", productLink);

      if (walletAddress) {
        formData.append("wallet_address", walletAddress.toLowerCase());
      }

      const email = user?.google?.email || user?.email?.address;
      if (email) {
        formData.append("email", email);
      }

      files.forEach((file) => {
        formData.append("files", file);
      });

      // Submit to API
      const response = await fetch("/api/createProject", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Profile incomplete") {
          setMissingFields(data.missingFields || []);
          setProfileComplete(false);
          return;
        }
        throw new Error(data.error || "Failed to create project");
      }

      // Success!
      toast.success("Project created successfully!", {
        description: "Your project is now live and visible to the community.",
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleGoToSettings = () => {
    onClose();
    router.push("/settings");
  };

  if (userLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }


  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Share your project and get valuable feedback from the community
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1.5">
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
                placeholder="Project title"
                disabled={!profileComplete}
              />
            </div>

            {/* Product Link */}
            <div>
              <label htmlFor="product_link" className="block text-sm font-medium mb-1.5">
                Product Link <span className="text-muted-foreground ml-1">(optional)</span>
              </label>
              <Input
                type="url"
                id="product_link"
                value={productLink}
                onChange={(e) => setProductLink(e.target.value)}
                disabled={!profileComplete}
                placeholder="https://example.com"
                className="w-full"
              />
            </div>
          </div>

          {/* Intro */}
          <div>
            <label htmlFor="intro" className="block text-sm font-medium mb-1.5">
              Intro
              <span className="text-destructive ml-1">*</span>
            </label>
            <textarea
              id="intro"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              required
              rows={2}
              maxLength={500}
              disabled={!profileComplete}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              placeholder="Brief introduction..."
            />
          </div>

          <div className="flex flex-col gap-4">
            {/* Features */}
            <div>
              <label htmlFor="features" className="block text-sm font-medium mb-1.5">
                Features
                <span className="text-destructive ml-1">*</span>
              </label>
              <textarea
                id="features"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                required
                rows={4}
                maxLength={1000}
                disabled={!profileComplete}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                placeholder="Key features list..."
              />
            </div>

            {/* What to Test */}
            <div>
              <label htmlFor="what_to_test" className="block text-sm font-medium mb-1.5">
                What to Test
                <span className="text-destructive ml-1">*</span>
              </label>
              <textarea
                id="what_to_test"
                value={whatToTest}
                onChange={(e) => setWhatToTest(e.target.value)}
                required
                rows={4}
                maxLength={1000}
                disabled={!profileComplete}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                placeholder="Testing instructions..."
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Attachments <span className="text-muted-foreground">(optional)</span>
            </label>

            {/* Compact Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => profileComplete && fileInputRef.current?.click()}
              className={`relative rounded-lg border-2 border-dashed p-4 flex items-center justify-center gap-4 transition-all ${!profileComplete
                ? "cursor-not-allowed opacity-50"
                : dragActive
                  ? "cursor-pointer border-primary bg-primary/5"
                  : "cursor-pointer border-border/50 bg-background/20 hover:bg-background/50 hover:border-border"
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                disabled={!profileComplete}
                className="hidden"
              />

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted/50">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">
                    Drop items or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Images up to 10MB • Max 5 files
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Grid */}
            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-4 sm:grid-cols-5 gap-3">
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    className="group relative aspect-square rounded-md overflow-hidden border border-border/50 bg-background/50"
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
                      className="absolute top-1 right-1 rounded-full bg-destructive/90 p-1 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          {!profileComplete && (
            <div className="rounded-lg bg-muted/50 border border-muted p-3 text-sm text-muted-foreground">
              Please complete your profile to create a project.
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              disabled={uploading}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            {!profileComplete ? (
              <Button
                type="button"
                onClick={handleGoToSettings}
                className="flex-1 gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                Create Profile
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={uploading || !title || !intro || !features || !whatToTest}
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
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
