"use client";

import { useState, useEffect } from "react";
import { supabase, Book } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import {
  BookOpen, Plus, Trash2, ChevronRight, BookMarked,
  Calendar, TrendingUp, Target, Edit2, Check, X, Sparkles
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { clsx } from "clsx";

const BOOK_COLORS = ["#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#ef4444"];

const emptyBook = {
  title: "", author: "", total_pages: 200, current_page: 0,
  daily_goal: 20, cover_url: "", color: BOOK_COLORS[0], target_date: "",
};

export default function LivrosPage() {
  const { books, setBooks, updateBook } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyBook });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [readingInput, setReadingInput] = useState<Record<string, number>>({});

  useEffect(() => { loadBooks(); }, []);

  async function loadBooks() {
    const { data } = await supabase.from("books").select("*").order("created_at");
    if (data) setBooks(data as Book[]);
  }

  async function saveBook() {
    if (!form.title.trim()) { toast.error("Informe o título do livro"); return; }
    if (form.total_pages < 1) { toast.error("Total de páginas inválido"); return; }
    setLoading(true);
    try {
      const payload = { ...form, pages_read_today: 0, target_date: form.target_date || null };
      if (editingId) {
        const { error } = await (supabase.from("books") as any).update(payload).eq("id", editingId);
        if (!error) { toast.success("Livro atualizado!"); await loadBooks(); setEditingId(null); }
      } else {
        if (books.length >= 4) { toast.error("Máximo de 4 livros cadastrados"); setLoading(false); return; }
        const { error } = await (supabase.from("books") as any).insert(payload);
        if (!error) { toast.success("Livro adicionado! 📚"); await loadBooks(); }
        else toast.error("Erro: " + error.message);
      }
      setForm({ ...emptyBook }); setShowForm(false);
    } finally { setLoading(false); }
  }

  async function deleteBook(id: string) {
    if (!confirm("Remover este livro?")) return;
    await supabase.from("books").delete().eq("id", id);
    await loadBooks();
    toast.success("Livro removido");
  }

  async function logReading(book: Book) {
    const pages = readingInput[book.id] || 0;
    if (pages <= 0) return;
    const newPage = Math.min(book.current_page + pages, book.total_pages);
    const newToday = book.pages_read_today + pages;
    const { error } = await (supabase.from("books") as any).update({
      current_page: newPage, pages_read_today: newToday, updated_at: new Date().toISOString(),
    }).eq("id", book.id);
    if (!error) {
      updateBook(book.id, { current_page: newPage, pages_read_today: newToday });
      toast.success(`+${pages} páginas registradas! 📖`);
      setReadingInput((p) => ({ ...p, [book.id]: 0 }));
    }
  }

  function startEdit(book: Book) {
    setForm({
      title: book.title, author: book.author || "", total_pages: book.total_pages,
      current_page: book.current_page, daily_goal: book.daily_goal,
      cover_url: book.cover_url || "", color: book.color, target_date: book.target_date || "",
    });
    setEditingId(book.id); setShowForm(true);
  }

  return (
    <div className="space-y-6 page-enter stagger-children">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen size={24} className="text-violet-400" /> Meus Livros
          </h1>
          <p className="text-slate-500 text-sm mt-1">Até 4 livros em leitura simultânea</p>
        </div>
        {books.length < 4 && !showForm && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyBook }); }}
            className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Adicionar
          </button>
        )}
      </div>

      {showForm && (
        <div className="card animate-slide-up">
          <h2 className="font-semibold text-white mb-4">{editingId ? "Editar Livro" : "Novo Livro"}</h2>
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
                    className={clsx("w-8 h-8 rounded-lg transition-all duration-200 hover:scale-110", form.color === c && "ring-2 ring-white/50 ring-offset-2 ring-offset-[#12121c]")}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={saveBook} disabled={loading} className="btn-primary flex items-center gap-2">
              <Check size={16} /> {loading ? "Salvando..." : editingId ? "Atualizar" : "Salvar Livro"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-ghost flex items-center gap-2">
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-violet-400" />
          </div>
          <h3 className="text-slate-400 font-medium mb-2">Nenhum livro ainda</h3>
          <p className="text-slate-600 text-sm">Adicione até 4 livros para acompanhar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book}
              readingValue={readingInput[book.id] || 0}
              onReadingChange={(v: number) => setReadingInput((p) => ({ ...p, [book.id]: v }))}
              onLog={() => logReading(book)} onEdit={() => startEdit(book)} onDelete={() => deleteBook(book.id)} />
          ))}
        </div>
      )}
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
    <div className="glass rounded-2xl p-5 glow-border transition-all duration-300" style={{ borderLeft: `4px solid ${book.color}40` }}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-14 h-20 rounded-xl overflow-hidden shadow-lg" style={{ background: book.color + "18" }}>
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
              {book.author && <p className="text-xs text-slate-600">{book.author}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-600 hover:text-slate-300 transition-colors">
                <Edit2 size={13} />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <MiniStat label="Progresso" value={`${progress}%`} color={book.color} />
            <MiniStat label="Página" value={`${book.current_page}/${book.total_pages}`} color="#64748b" />
            <MiniStat label="Meta hoje" value={`${book.pages_read_today}/${book.daily_goal}`} color={dailyLeft === 0 ? "#10b981" : "#f59e0b"} />
            {finishDate && <MiniStat label="Previsão" value={format(finishDate, "dd/MM")} color="#0ea5e9" />}
          </div>

          <div className="progress-bar mt-3 h-1.5">
            <div className="progress-fill h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${book.color}, ${book.color}aa)` }} />
          </div>

          {book.target_date && daysUntilTarget !== null && daysUntilTarget > 0 && pagesNeededPerDay && pagesNeededPerDay > book.daily_goal && (
            <p className="text-xs text-orange-400/80 mt-2 flex items-center gap-1">
              ⚡ Para terminar em {format(parseISO(book.target_date), "dd/MM")}: {pagesNeededPerDay} pgs/dia
            </p>
          )}

          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-0.5 bg-white/3 border border-white/5 rounded-xl overflow-hidden">
              <button onClick={() => onReadingChange(Math.max(0, readingValue - 5))}
                className="px-3 py-2 text-slate-500 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">−</button>
              <input type="number" value={readingValue} onChange={(e) => onReadingChange(+e.target.value)}
                className="w-14 text-center bg-transparent text-white text-sm py-2 focus:outline-none" placeholder="0" />
              <button onClick={() => onReadingChange(readingValue + 5)}
                className="px-3 py-2 text-slate-500 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">+</button>
            </div>
            <span className="text-xs text-slate-600">págs</span>
            <button onClick={onLog} disabled={!readingValue}
              className="btn-primary text-xs py-2 px-4 disabled:opacity-30">
              + Registrar
            </button>
            {dailyLeft > 0 ? (
              <span className="text-xs text-orange-400/70 ml-auto">{dailyLeft} faltam</span>
            ) : (
              <span className="text-xs text-emerald-400 ml-auto flex items-center gap-1">
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
    <div className="bg-white/3 rounded-lg p-2 border border-white/[0.03]">
      <p className="text-[10px] text-slate-600 mb-0.5">{label}</p>
      <p className="text-sm font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}
