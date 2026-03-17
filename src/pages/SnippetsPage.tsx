// Quick responses (snippets) – create, edit, delete; filter by topic; use /command in chat
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  listQuickResponses,
  createQuickResponse,
  updateQuickResponse,
  deleteQuickResponse,
  type QuickResponseSnippet,
} from "@/api/quickResponsesApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const MESSAGE_PREVIEW_LEN = 80;

export default function SnippetsPage() {
  const { t } = useTranslation();
  const [snippets, setSnippets] = useState<QuickResponseSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<QuickResponseSnippet | null>(null);
  const [form, setForm] = useState({ command: "", name: "", message: "", topicsStr: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listQuickResponses({
        includeGlobal: true,
        topic: topicFilter || undefined,
      });
      setSnippets(list);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t("snippets.errorLoad"));
      setSnippets([]);
    } finally {
      setLoading(false);
    }
  }, [topicFilter, t]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const topics = Array.from(
    new Set(snippets.flatMap((s) => s.topics || []).filter(Boolean))
  ).sort();

  const filtered = snippets.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.command || "").toLowerCase().includes(q) ||
      (s.message || "").toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setForm({ command: "", name: "", message: "", topicsStr: "" });
    setEditing(null);
    setAddOpen(true);
  };

  const openEdit = (s: QuickResponseSnippet) => {
    if (s.businessId == null) {
      toast.error(t("snippets.cannotEditGlobal"));
      return;
    }
    setForm({
      command: s.command || "",
      name: s.name || "",
      message: s.message || "",
      topicsStr: (s.topics || []).join(", "),
    });
    setEditing(s);
    setAddOpen(false);
  };

  const closeDialog = () => {
    setAddOpen(false);
    setEditing(null);
    setForm({ command: "", name: "", message: "", topicsStr: "" });
  };

  const handleSave = async () => {
    const command = (form.command || "").trim().replace(/^\//, "").toLowerCase().replace(/\s+/g, "_");
    const name = (form.name || "").trim();
    const message = (form.message || "").trim();
    if (!command || !name || !message) {
      toast.error(t("snippets.fillRequired"));
      return;
    }
    setSaving(true);
    try {
      const topics = form.topicsStr
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (editing) {
        await updateQuickResponse(editing._id, {
          command,
          name,
          message,
          topics,
        });
        toast.success(t("snippets.updated"));
      } else {
        await createQuickResponse({ command, name, message, topics });
        toast.success(t("snippets.created"));
      }
      closeDialog();
      fetchList();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error?.command || e?.message;
      toast.error(msg || t("snippets.errorSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: QuickResponseSnippet) => {
    if (s.businessId == null) {
      toast.error(t("snippets.cannotDeleteGlobal"));
      return;
    }
    if (!window.confirm(t("snippets.confirmDelete"))) return;
    setDeletingId(s._id);
    try {
      await deleteQuickResponse(s._id);
      toast.success(t("snippets.deleted"));
      fetchList();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t("snippets.errorDelete"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("snippets.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("snippets.description")}
          </p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          {t("snippets.addSnippet")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("snippets.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={topicFilter || "__all__"}
              onValueChange={(v) => setTopicFilter(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t("snippets.filterByTopic")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("snippets.allTopics")}</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("snippets.noSnippets")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("snippets.name")}</TableHead>
                  <TableHead>{t("snippets.message")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("snippets.topics")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("snippets.id")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("snippets.dateAdded")}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="max-w-[200px] sm:max-w-[280px]">
                      <span className="line-clamp-2 text-muted-foreground">
                        {(s.message || "").length > MESSAGE_PREVIEW_LEN
                          ? (s.message || "").slice(0, MESSAGE_PREVIEW_LEN) + "..."
                          : s.message || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {(s.topics || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(s.topics || []).slice(0, 3).map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs">
                              {t}
                            </Badge>
                          ))}
                          {(s.topics || []).length > 3 && (
                            <Badge variant="outline">+{(s.topics || []).length - 3}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs">
                      /{s.command}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                      {s.updatedAt
                        ? new Date(s.updatedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEdit(s)}
                            disabled={s.businessId == null}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("snippets.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(s)}
                            disabled={s.businessId == null || deletingId === s._id}
                            className="text-destructive"
                          >
                            {deletingId === s._id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            {t("snippets.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={addOpen || !!editing} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("snippets.editSnippet") : t("snippets.addSnippet")}
            </DialogTitle>
            <DialogDescription>
              {t("snippets.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="snippet-command">{t("snippets.command")} (/command)</Label>
              <Input
                id="snippet-command"
                placeholder="factura"
                value={form.command}
                onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="snippet-name">{t("snippets.name")}</Label>
              <Input
                id="snippet-name"
                placeholder={t("snippets.namePlaceholder")}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="snippet-message">{t("snippets.message")}</Label>
              <Textarea
                id="snippet-message"
                placeholder={t("snippets.messagePlaceholder")}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="snippet-topics">{t("snippets.topics")} ({t("snippets.commaSeparated")})</Label>
              <Input
                id="snippet-topics"
                placeholder="factura, pago"
                value={form.topicsStr}
                onChange={(e) => setForm((f) => ({ ...f, topicsStr: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t("snippets.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? t("snippets.saveChanges") : t("snippets.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
