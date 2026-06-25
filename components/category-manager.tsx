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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { IconEdit, IconTrash, IconSettings } from "@tabler/icons-react";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/categories";
import type { UserCategoryRecord } from "@/lib/actions/categories";

const PRESET_COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#FF6B6B", "#4ECDC4", "#00C853", "#AB47BC", "#95A5A6",
  "#FF7043", "#26A69A", "#42A5F5", "#EC407A", "#7E57C2",
];

const PRESET_ICONS = ["🍔", "✈️", "🎬", "📄", "🛍️", "🏥", "📚", "📈", "🔄", "📦", "☕", "🏠", "🚗", "🎮", "👕", "💡", "🎁", "🏋️", "💊", "🎓"];

type CategoryManagerProps = {
  categories: UserCategoryRecord[];
};

export function CategoryManager({ categories }: CategoryManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState("General");

  const startEdit = (cat: UserCategoryRecord) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || "");
    setEditColor(cat.color || "");
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: editName.trim(),
          icon: editIcon || undefined,
          color: editColor || undefined,
        });
      } else {
        await createCategory({ name: editName.trim(), icon: editIcon || undefined, color: editColor || undefined });
      }
      setEditingId(null);
      setEditName("");
      setEditIcon("");
      setEditColor("");
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget, reassignTo);
      setDeleteTarget(null);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <IconSettings className="mr-2 h-4 w-4" />
          Manage Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 rounded-lg border p-2">
              <span className="text-lg">{cat.icon || "📦"}</span>
              <div className="flex-1">
                <span className="font-medium text-sm">{cat.name}</span>
                {cat.parentId && (
                  <Badge variant="outline" className="ml-2 text-[10px]">sub</Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(cat)}>
                  <IconEdit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteTarget(cat.id); setReassignTo("General"); }}>
                  <IconTrash className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit form */}
        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            {editingId ? "Edit Category" : "Add New Category"}
          </p>
          <div className="space-y-2">
            <Label className="text-xs">Name</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Category name"
              className="h-8 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Icon (emoji)</Label>
              <div className="flex gap-1 flex-wrap">
                {PRESET_ICONS.slice(0, 8).map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`h-7 w-7 rounded text-sm cursor-pointer hover:bg-muted ${editIcon === icon ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setEditIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
                <Input
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  placeholder="or type..."
                  className="h-7 w-16 text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.slice(0, 8).map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-6 w-6 rounded-full cursor-pointer ${editColor === color ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditColor(color)}
                  />
                ))}
                <Input
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  placeholder="#hex"
                  className="h-7 w-16 text-xs"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {editingId && (
              <Button variant="outline" size="sm" onClick={() => { setEditingId(null); setEditName(""); setEditIcon(""); setEditColor(""); }}>
                Cancel
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={loading || !editName.trim()}>
              {loading ? "Saving..." : editingId ? "Update" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Expenses using this category will be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Reassign expenses to:</Label>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="w-full h-8 rounded border px-2 text-sm"
            >
              {categories.filter(c => c.id !== deleteTarget).map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
