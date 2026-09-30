import { useState, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Clock,
  Layers,
  Trash2,
  Package,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { InventoryItem, Project } from "@shared/orgTypes";
import { loadInitialInventory, saveInventory, loadInitialProjects } from "@/lib/orgStore";

export function InventoryView() {
  const [items, setItems] = useState<InventoryItem[]>(() => loadInitialInventory());
  const [projects] = useState<Project[]>(() => loadInitialProjects());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Item Form
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<InventoryItem["category"]>("Raw Material");
  const [formStock, setFormStock] = useState(250);
  const [formThreshold, setFormThreshold] = useState(50);
  const [formUnit, setFormUnit] = useState("kg");
  const [formUnitCost, setFormUnitCost] = useState(12.5);
  const [formLocation, setFormLocation] = useState("Central Depot / Bay 4");
  const [formConsumption, setFormConsumption] = useState(25);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchSearch =
        it.name.toLowerCase().includes(search.toLowerCase()) ||
        it.location.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "All" || it.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [items, search, categoryFilter]);

  const summary = useMemo(() => {
    const totalSKUs = items.length;
    const totalVal = items.reduce((sum, it) => sum + it.currentStock * it.unitCost, 0);
    const lowStockCount = items.filter((it) => it.currentStock <= it.minimumThreshold).length;
    const criticalStockCount = items.filter((it) => it.projectedStockoutDays <= 7).length;
    return { totalSKUs, totalVal, lowStockCount, criticalStockCount };
  }, [items]);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Item name is required");
      return;
    }

    const stock = Number(formStock) || 0;
    const threshold = Number(formThreshold) || 10;
    const rate = Number(formConsumption) || 1;
    const stockoutDays = Math.round((stock / (rate / 7 || 1)));

    const newItem: InventoryItem = {
      id: `INV-${Date.now().toString(36).toUpperCase()}`,
      name: formName.trim(),
      category: formCategory,
      currentStock: stock,
      minimumThreshold: threshold,
      unit: formUnit.trim() || "units",
      unitCost: Number(formUnitCost) || 1,
      location: formLocation.trim() || "Storage",
      reorderStatus: stock <= threshold * 0.5 ? "Critical" : stock <= threshold ? "Low Stock" : "Normal",
      consumptionRatePerWeek: rate,
      projectedStockoutDays: stockoutDays,
    };

    const updated = [...items, newItem];
    setItems(updated);
    saveInventory(updated);
    toast.success(`Inventory SKU "${newItem.name}" added!`);

    setFormName("");
    setIsModalOpen(false);
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Remove "${name}" from inventory?`)) {
      const updated = items.filter((it) => it.id !== id);
      setItems(updated);
      saveInventory(updated);
      toast.success("SKU removed");
    }
  };

  const handleQuickRestock = (item: InventoryItem) => {
    const restockAmount = item.minimumThreshold * 2;
    const updated = items.map((it) => {
      if (it.id === item.id) {
        const newStock = it.currentStock + restockAmount;
        const days = Math.round((newStock / (it.consumptionRatePerWeek / 7 || 1)));
        return {
          ...it,
          currentStock: newStock,
          reorderStatus: "Normal" as const,
          projectedStockoutDays: days,
        };
      }
      return it;
    });
    setItems(updated);
    saveInventory(updated);
    toast.success(`Restocked +${restockAmount} ${item.unit} for "${item.name}"`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/10 text-cyan-400 uppercase tracking-wider">
              Material Resources
            </span>
            <span className="text-xs text-muted-foreground">• Stockout Predictions & Reorder Thresholds</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mt-1">Materials & Inventory Tracker</h2>
          <p className="text-sm text-muted-foreground">
            Monitor raw materials, consumables, fuel, and critical spare parts to prevent project halts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Material / Stock SKU
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Tracked Material SKUs</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">{summary.totalSKUs}</span>
            <span className="text-xs text-emerald-400 font-medium">Active items</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Total On-Hand Valuation</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-400">
              ${(summary.totalVal / 1000).toFixed(1)}k
            </span>
            <span className="text-xs text-muted-foreground">held stock</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Low Stock Triggers</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                summary.lowStockCount > 0 ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {summary.lowStockCount}
            </span>
            <span className="text-xs text-muted-foreground">
              {summary.lowStockCount > 0 ? "Below threshold" : "All optimal"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground font-medium">Predicted Stockouts (&lt; 7d)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                summary.criticalStockCount > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {summary.criticalStockCount}
            </span>
            <span className="text-xs text-muted-foreground">
              {summary.criticalStockCount > 0 ? "Action required" : "Buffer intact"}
            </span>
          </div>
        </div>
      </div>

      {/* Stockout Warning Banner if any critical */}
      {summary.lowStockCount > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 backdrop-blur-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">
                {summary.lowStockCount} Material SKU{summary.lowStockCount > 1 ? "s" : ""} below safe threshold
              </span>
              <p className="text-slate-300 text-[11px] mt-0.5">
                AI predicts potential project bottlenecks if inventory is not replenished within consumption schedules.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-card/40">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search material, SKU, location..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
          >
            <option value="All">All Categories</option>
            <option value="Raw Material">Raw Material</option>
            <option value="Consumable">Consumable</option>
            <option value="Spare Part">Spare Part</option>
            <option value="Fuel">Fuel</option>
            <option value="Chemical">Chemical</option>
            <option value="Supplies">Supplies</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      {items.length === 0 ? (
        <div className="border border-dashed border-border/60 rounded-xl p-12 text-center bg-card/20 max-w-lg mx-auto">
          <Boxes className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-base text-foreground">No Materials Configured</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Add raw materials, consumables, fuel, or spare parts to track consumption velocity and automated stockout predictions.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              + Add First Material SKU
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl overflow-hidden bg-card/30">
          <div className="overflow-x-auto">
            <table className="resource-table w-full text-xs">
              <thead>
                <tr>
                  <th>SKU ID</th>
                  <th>Material / Item Name</th>
                  <th>Category</th>
                  <th>Storage Location</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Burn Rate</th>
                  <th>Predicted Stockout</th>
                  <th>Total Value</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isLow = item.currentStock <= item.minimumThreshold;
                  return (
                    <tr key={item.id}>
                      <td className="mono text-cyan-400 font-bold">{item.id}</td>
                      <td>
                        <span className="font-semibold text-white block">{item.name}</span>
                        <span className="text-[10px] text-slate-400 mono">
                          ${item.unitCost} / {item.unit}
                        </span>
                      </td>
                      <td className="text-slate-300 font-medium">{item.category}</td>
                      <td className="text-slate-400">{item.location}</td>
                      <td className="mono">
                        <span
                          className={`font-bold ${
                            isLow ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {item.currentStock.toLocaleString()}
                        </span>
                        <span className="text-slate-400"> {item.unit}</span>
                      </td>
                      <td className="mono text-slate-400">
                        {item.minimumThreshold} {item.unit}
                      </td>
                      <td className="mono text-slate-300">
                        ~{item.consumptionRatePerWeek} {item.unit}/wk
                      </td>
                      <td>
                        <span
                          className={`font-mono text-xs font-bold ${
                            item.projectedStockoutDays <= 7
                              ? "text-rose-400"
                              : item.projectedStockoutDays <= 14
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {item.projectedStockoutDays} days
                        </span>
                      </td>
                      <td className="mono text-emerald-400 font-semibold">
                        ${(item.currentStock * item.unitCost).toLocaleString()}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleQuickRestock(item)}
                            title="Quick Reorder / Restock"
                            className="p-1 rounded text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            title="Remove SKU"
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Material SKU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary" /> Register Material / Consumable SKU
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Portland Cement Type 1 / Diesel Fuel / Sterile Syringes"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e: any) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="Raw Material">Raw Material</option>
                    <option value="Consumable">Consumable</option>
                    <option value="Spare Part">Spare Part</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Chemical">Chemical</option>
                    <option value="Supplies">Supplies</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. kg, liters, tons, boxes"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Current Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Reorder Threshold</label>
                  <input
                    type="number"
                    min={0}
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formUnitCost}
                    onChange={(e) => setFormUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Warehouse 2 / Silo 3"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Weekly Consumption Rate</label>
                  <input
                    type="number"
                    min={1}
                    value={formConsumption}
                    onChange={(e) => setFormConsumption(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-accent text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  Record SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
