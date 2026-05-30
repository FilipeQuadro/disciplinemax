"use client";

import { useState, useEffect } from "react";
import { Book } from "@/lib/supabase";
import { dataFetch } from "@/lib/data-fetch";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { canDoAction, PLAN_LIMITS, type PlanType } from "@/lib/plans";
import {
  BookOpen, Plus, Trash2, Edit2, Check, X
} from "lucide-react";
import { toast } from "react-hot-toast";
import { errorToast } from "@/lib/toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { clsx } from "clsx";
import { trackPagesRead } from "@/lib/stats";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { checkAndNotifyGoalCompletion } from "@/lib/notifications";

const BOOK_COLORS = ["#7C6BBD", "#3ABAB4", "#D4AF37", "#E8844A", "#D94F4F", "#7C6BBD"];

const emptyBook = {
  title: "", author: "", total_pages: 200, current_page: 0,
  daily_goal: 20, cover_url: "", color: BOOK_COLORS[0], target_date: "",
};

export default function LivrosPage() {
  const { books, setBooks, updateBook } = useStore();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyBook });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [readingInput, setReadingInput] = useState<Record<string, number>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { loadBooks(); }, [user]);

  async function loadBooks() {
    if (!user) return;
    try {
      const { data, error } = await dataFetch({ action: "select", table: "books", filters: { eq: { user_id: user.id }, order: { column: "created_at", ascending: true } } });
      if (error) { errorToast(error, loadBooks); return; }
      if (data) setBooks(data as Book[]);
    } catch {
      toast.error("Erro ao carregar livros");
    }
  }

  async function saveBook() {
    if (!user) { toast.error("Serviço indisponível"); return; }
    if (!form.title.trim()) { toast.error("Informe o título do livro"); return; }
    if (form.total_pages < 1) { toast.error("Total de páginas inválido"); return; }

    // Check plan limits before adding a new book
    if (!editingId) {
      try {
        const { data: planData } = await dataFetch({ action: "select", table: "user_plans", filters: { eq: { user_id: user.id }, maybeSingle: true, select: "plan" } });
        const plan = ((planData as any)?.plan as PlanType) || "free";
        if (!canDoAction(plan, "maxBooks", books.length)) {
          toast.error(`Limite do plano atingido! Você pode ter até ${PLAN_LIMITS[plan].maxBooks} livros no plano ${PLAN_LIMITS[plan].label}.`);
          return;
        }
      } catch { /* allow if plan check fails */ }
    }

    setLoading(true);
    try {
      const payload = { ...form, user_id: user.id, pages_read_today: 0, target_date: form.target_date || null };
      if (editingId) {
        const { error } = await dataFetch({ action: "update", table: "books", id: editingId, payload });
        if (error) { toast.error("Erro ao atualizar: " + error); return; }
        toast.success("Livro atualizado!");
        await loadBooks();
        setEditingId(null);
      } else {
        const { error } = await dataFetch({ action: "insert", table: "books", payload });
        if (error) { toast.error("Erro ao adicionar: " + error); return; }
        toast.success("Livro adicionado! 📚");
        await loadBooks();
      }
      setForm({ ...emptyBook });
      setShowForm(false);
    } catch {
      toast.error("Erro ao salvar livro");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBook(id: string) {
    try {
      const { error } = await dataFetch({ action: "delete", table: "books", id });
      if (error) { toast.error("Erro ao remover"); return; }
      await loadBooks();
      toast.success("Livro removido");
    } catch (err) {
      toast.error("Erro ao remover livro");
    }
  }

  async function logReading(book: Book) {
    const pages = readingInput[book.id] || 0;
    if (pages <= 0) return;
    try {
      const newPage = Math.min(book.current_page + pages, book.total_pages);
      const newToday = book.pages_read_today + pages;
      const { error } = await dataFetch({
          action: "update", table: "books", id: book.id,
          payload: { current_page: newPage, pages_read_today: newToday, updated_at: new Date().toISOString() },
      });
      if (error) { toast.error("Erro ao registrar"); return; }
      updateBook(book.id, { current_page: newPage, pages_read_today: newToday });
      // Auto-update daily stats
      const allBooks = useStore.getState().books.map((b) => b.id === book.id ? { ...b, current_page: newPage, pages_read_today: newToday } : b);
      const totalGoal = allBooks.reduce((s: number, b: any) => s + b.daily_goal, 0);
      const totalRead = allBooks.reduce((s: number, b: any) => s + b.pages_read_today, 0);
      if (user) trackPagesRead(user.id, pages, totalGoal, totalRead, useStore.getState().todayBibleChapters, useStore.getState().bibleGoal?.daily_chapters || 0).catch(() => {});
      checkAndNotifyGoalCompletion({ pagesReadToday: totalRead, pagesGoal: totalGoal, bibleChaptersToday: useStore.getState().todayBibleChapters, bibleChaptersGoal: useStore.getState().bibleGoal?.daily_chapters || 0 });
      toast.success(`+${pages} páginas registradas! 📖`);
      setReadingInput((p) => ({ ...p, [book.id]: 0 }));
    } catch {
      toast.error("Erro ao registrar leitura");
    }
  }

  function startEdit(book: Book) {
    setForm({
      title: book.title, author: book.author || "", total_pages: book.total_pages,
      current_page: book.current_page, daily_goal: book.daily_goal,
      cover_url: book.cover_url || "", color: book.color, target_date: book.target_date || "",
    });
    setEditingId(book.id);
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
            <BookOpen size={24} style={{ color: "#7C6BBD" }} /> Meus Livros
          </h1>
          <p className="text-sm mt-1" style={{ color: "#555E6E" }}>Acompanhe sua leitura</p>
        </div>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyBook }); }}
            className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Adicionar
          </button>
        )}
      </div>

      {showForm && (
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">{editingId ? "Editar Livro" : "Novo Livro"}</h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#555E6E" }}>
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Título *</label>
              <input className="input" placeholder="Ex: Atomic Habits" value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Autor</label>
              <input className="input" placeholder="James Clear" value={form.author}
                onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} />
            </div>
            <div>
              <label className="label">Total de Páginas *</label>
              <input type="number" className="input" value={form.total_pages}
                onChange={(e) => setForm((p) => ({ ...p, total_pages: +e.target.value }))} />
            </div>
            <div>
              <label className="label">Página Atual</label>
              <input type="number" className="input" value={form.current_page}
                onChange={(e) => setForm((p) => ({ ...p, current_page: +e.target.value }))} />
            </div>
            <div>
              <label className="label">Meta Diária (páginas)</label>
              <input type="number" className="input" value={form.daily_goal}
                onChange={(e) => setForm((p) => ({ ...p, daily_goal: +e.target.value }))} />
            </div>
            <div>
              <label className="label">Data Alvo</label>
              <input type="date" className="input" value={form.target_date}
                onChange={(e) => setForm((p) => ({ ...p, target_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">URL da Capa</label>
              <input className="input" placeholder="https://..." value={form.cover_url}
                onChange={(e) => setForm((p) => ({ ...p, cover_url: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cor</label>
              <div className="flex gap-2 mt-1">
                {BOOK_COLORS.map((c) => (
                  <button key={c} onClick={() => setForm((p) => ({ ...p, color: c }))}
                    className={clsx("w-8 h-8 rounded-lg transition-all duration-200 hover:scale-110", form.color === c && "ring-2 ring-offset-2 ring-offset-[#141820]")}
                    style={{ background: c }}
                    aria-label={`Cor ${c}`}
                    aria-pressed={form.color === c} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={saveBook} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-[#0B0E14]/20 border-t-[#0B0E14] rounded-full animate-spin" /> : <Check size={16} />}
              {loading ? "Salvando..." : editingId ? "Atualizar" : "Salvar Livro"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-ghost flex items-center gap-2">
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {books.length === 0 && !showForm ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(124,107,189,0.08)" }}>
            <BookOpen size={28} style={{ color: "#7C6BBD" }} />
          </div>
          <h3 className="font-medium mb-2" style={{ color: "#8B95A5" }}>Nenhum livro ainda</h3>
          <p className="text-sm" style={{ color: "#555E6E" }}>Adicione um livro para acompanhar sua leitura</p>
        </div>
      ) : (
        <div className="space-y-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book}
              readingValue={readingInput[book.id] || 0}
              onReadingChange={(v: number) => setReadingInput((p) => ({ ...p, [book.id]: v }))}
              onLog={() => logReading(book)}               onEdit={() => startEdit(book)} onDelete={() => setConfirmDelete(book.id)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Remover livro?"
        message="Esta ação não pode ser desfeita. O livro e todo o progresso serão removidos permanentemente."
        confirmLabel="Remover"
        destructive
        onConfirm={() => { if (confirmDelete) { deleteBook(confirmDelete); setConfirmDelete(null); } }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

interface BookCardProps {
  book: Book; readingValue: number; onReadingChange: (v: number) => void;
  onLog: () => void; onEdit: () => void; onDelete: () => void;
}

function BookCard({ book, readingValue, onReadingChange, onLog, onEdit, onDelete }: BookCardProps) {
  const progress = Math.round((book.current_page / book.total_pages) * 100);
  const pagesLeft = book.total_pages - book.current_page;
  const dailyLeft = Math.max(0, book.daily_goal - book.pages_read_today);
  const daysToFinish = book.daily_goal > 0 ? Math.ceil(pagesLeft / book.daily_goal) : null;
  const finishDate = daysToFinish ? new Date(Date.now() + daysToFinish * 86400000) : null;
  const daysUntilTarget = book.target_date ? differenceInDays(parseISO(book.target_date), new Date()) : null;
  const pagesNeededPerDay = book.target_date
    ? Math.ceil(pagesLeft / Math.max(1, differenceInDays(parseISO(book.target_date), new Date()))) : null;

  return (
    <div className="rounded-2xl p-5 glow-border transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderLeft: `3px solid ${book.color}40`,
      }}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-14 h-20 rounded-xl overflow-hidden"
          style={{ background: book.color + "10" }}>
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen size={20} style={{ color: book.color }} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-white">{book.title}</h3>
              {book.author && <p className="text-xs" style={{ color: "#555E6E" }}>{book.author}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#555E6E" }}>
                <Edit2 size={13} />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: "#555E6E" }}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <MiniStat label="Progresso" value={`${progress}%`} color={book.color} />
            <MiniStat label="Página" value={`${book.current_page}/${book.total_pages}`} color="#8B95A5" />
            <MiniStat label="Meta hoje" value={`${book.pages_read_today}/${book.daily_goal}`} color={dailyLeft === 0 ? "#3ABAB4" : "#D4AF37"} />
            {finishDate && <MiniStat label="Previsão" value={format(finishDate, "dd/MM")} color="#3ABAB4" />}
          </div>

          <div className="progress-bar mt-3">
            <div className="progress-fill"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${book.color}, ${book.color}88)` }} />
          </div>

          {book.target_date && daysUntilTarget !== null && daysUntilTarget > 0 && pagesNeededPerDay && pagesNeededPerDay > book.daily_goal && (
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "rgba(232,132,74,0.8)" }}>
              ⚡ Para terminar em {format(parseISO(book.target_date), "dd/MM")}: {pagesNeededPerDay} pgs/dia
            </p>
          )}

          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-0.5 rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <button onClick={() => onReadingChange(Math.max(0, readingValue - 5))}
                className="px-3 py-2 hover:bg-white/5 transition-colors text-sm font-medium" style={{ color: "#555E6E" }}>−</button>
              <input type="number" value={readingValue} onChange={(e) => onReadingChange(+e.target.value)}
                className="w-14 text-center bg-transparent text-white text-sm py-2 focus:outline-none" placeholder="0" />
              <button onClick={() => onReadingChange(readingValue + 5)}
                className="px-3 py-2 hover:bg-white/5 transition-colors text-sm font-medium" style={{ color: "#555E6E" }}>+</button>
            </div>
            <span className="text-xs" style={{ color: "#555E6E" }}>págs</span>
            <button onClick={onLog} disabled={!readingValue}
              className="btn-primary text-xs py-2 px-4 disabled:opacity-30">
              + Registrar
            </button>
            {dailyLeft > 0 ? (
              <span className="text-xs ml-auto" style={{ color: "rgba(232,132,74,0.7)" }}>{dailyLeft} faltam</span>
            ) : (
              <span className="text-xs ml-auto flex items-center gap-1" style={{ color: "#3ABAB4" }}>
                <Check size={10} /> Meta! ✨
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
      <p className="text-[10px] mb-0.5" style={{ color: "#555E6E" }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}
