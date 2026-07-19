"use client";

import { type RefObject } from "react";
import { Upload, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface LeadFormProps {
  form: { name: string; email: string; company: string; message: string };
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFormChange: (form: LeadFormProps["form"]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onLoadSample: () => void;
  onCsv: (file: File) => void;
}

export function LeadForm({ form, fileInputRef, onFormChange, onSubmit, onLoadSample, onCsv }: LeadFormProps) {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h2 className="font-medium flex items-center gap-1.5">
          <Sparkles className="size-4 text-primary" />
          Add leads
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={onLoadSample}>
            Load sample leads
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            Upload CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
          />
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Name"
          value={form.name}
          onChange={(e) => onFormChange({ ...form, name: e.target.value })}
        />
        <Input
          placeholder="Email"
          value={form.email}
          onChange={(e) => onFormChange({ ...form, email: e.target.value })}
        />
        <Input
          placeholder="Company (optional)"
          value={form.company}
          onChange={(e) => onFormChange({ ...form, company: e.target.value })}
          className="sm:col-span-2"
        />
        <Textarea
          placeholder="Message"
          value={form.message}
          onChange={(e) => onFormChange({ ...form, message: e.target.value })}
          rows={2}
          className="sm:col-span-2"
        />
        <Button type="submit" className="rounded-full sm:col-span-2 sm:w-fit">
          Add lead
        </Button>
      </form>
    </Card>
  );
}
