import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PitchMarkdownImage } from "@/components/pitch-markdown-image";

type PitchMarkdownProps = {
  markdown: string;
  className?: string;
};

const components: Components = {
  img: ({ src, alt }) => (
    <PitchMarkdownImage
      src={typeof src === "string" ? src : undefined}
      alt={alt ?? ""}
      className="my-4 max-h-[420px] w-full rounded-lg border border-border object-contain"
    />
  ),
  a: ({ href, children, ...rest }) => (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {children}
    </a>
  ),
};

export function PitchMarkdown({ markdown, className = "" }: PitchMarkdownProps) {
  return (
    <div
      className={`pitch-md space-y-4 text-sm text-muted-foreground [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:leading-relaxed [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-4 ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
