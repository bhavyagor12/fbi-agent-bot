"use client";

import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export interface ProjectAttachment {
  id: number;
  url: string;
  media_type: string;
}

interface ProjectAttachmentsCarouselProps {
  attachments: ProjectAttachment[];
  className?: string;
  imageClassName?: string;
  showControls?: boolean;
}

export default function ProjectAttachmentsCarousel({
  attachments,
  className,
  imageClassName,
  showControls = true,
}: ProjectAttachmentsCarouselProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  // If only one image, show it without carousel
  if (attachments.length === 1) {
    const attachment = attachments[0];
    return (
      <div className={cn("relative w-full h-48 rounded-lg overflow-hidden bg-muted", className)}>
        <Image
          src={attachment.url}
          alt="Project attachment"
          fill
          className={cn("object-cover", imageClassName)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    );
  }

  // Multiple images - use carousel
  return (
    <div className={cn("relative w-full", className)}>
      <Carousel className="w-full">
        <CarouselContent>
          {attachments.map((attachment) => (
            <CarouselItem key={attachment.id}>
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                <Image
                  src={attachment.url}
                  alt="Project attachment"
                  fill
                  className={cn("object-cover", imageClassName)}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {showControls && attachments.length > 1 && (
          <>
            <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2" />
            <CarouselNext className="right-2 top-1/2 -translate-y-1/2" />
          </>
        )}
      </Carousel>
      {/* Dots indicator */}
      {attachments.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {attachments.map((_, index) => (
            <div
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30"
            />
          ))}
        </div>
      )}
    </div>
  );
}

