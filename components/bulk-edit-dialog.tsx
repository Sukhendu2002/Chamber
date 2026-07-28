"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/tag-input";
import { IconTags, IconCategory } from "@tabler/icons-react";
import { bulkCategorizeExpenses, bulkTagExpenses } from "@/lib/actions/categories";
import type { UserCategoryRecord } from "@/lib/actions/categories";

type BulkEditDialogProps = {
  selectedIds: string[];
  categories: UserCategoryRecord[];
  allTags: string[];
  onClose?: () => void;
};

export function BulkEditDialog({ selectedIds, categories, allTags, onClose }: BulkEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"tag" | "categorize">("tag");
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  if (selectedIds.length === 0) return null;

  const handleApply = async () => {
    setLoading(true);
    try {
      if (mode === "tag" && tags.length > 0) {
        await bulkTagExpenses(selectedIds, tags);
      } else if (mode === "categorize" && category) {
        await bulkCategorizeExpenses(selectedIds, category);
      }
      setOpen(false);
      router.refresh();
      onClose?.();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <IconTags className="mr-2 h-4 w-4" />
          Bulk Edit ({selectedIds.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedIds.length} Expenses</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === "tag" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("tag")}
            >
              <IconTags className="mr-1 h-4 w-4" /> Add Tags
            </Button>
            <Button
              variant={mode === "categorize" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("categorize")}
            >
              <IconCategory className="mr-1 h-4 w-4" /> Change Category
            </Button>
          </div>

          {mode === "tag" ? (
            <div className="space-y-2">
              <Label>Tags to add</Label>
              <TagInput
                value={tags}
                onChange={setTags}
                suggestions={allTags}
                placeholder="Type tags to add..."
              />
              <p className="text-xs text-muted-foreground">
                These tags will be added to all {selectedIds.length} selected expenses.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>New Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.icon || "📦"} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={loading || (mode === "tag" ? tags.length === 0 : !category)}
          >
            {loading ? "Applying..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
