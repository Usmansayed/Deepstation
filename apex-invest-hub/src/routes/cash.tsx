import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getCashTransactions } from "@/lib/api";
import type { CashTransaction as ApiCashTransaction } from "@/lib/data-schemas";
import cashHistoryFallback from "../../../data/platform/cash_transactions.json";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/cash")({
  component: CashPage,
});

type CashTransaction = ApiCashTransaction;

function CashPage() {
  const [transferType, setTransferType] = useState<"Deposit money" | "Withdraw money" | "Transfer between wallets">("Deposit money");
  const [account, setAccount] = useState("Chase •••• 4821");
  const [history, setHistory] = useState<CashTransaction[]>(cashHistoryFallback as CashTransaction[]);

  useEffect(() => {
    getCashTransactions()
      .then(setHistory)
      .catch((err) => {
        console.error("Failed to load cash transactions", err);
        setHistory(cashHistoryFallback as CashTransaction[]);
      });
  }, []);
  const [destination, setDestination] = useState("Fund Cash Wallet");
  const [amount, setAmount] = useState(400);
  const [lastCreatedKey, setLastCreatedKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const totalBalance = history.reduce((sum, txn) => {
    if (txn.type === "Deposit") return sum + txn.amount;
    if (txn.type === "Withdrawal") return sum - txn.amount;
    return sum;
  }, 0);
  const withdrawable = Math.max(0, totalBalance - 300);

  return (
    <AppShell activeSection="cash">
      <div className="mx-auto w-full max-w-[1320px] grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <article className="mb-6 rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Venture Flow Cash</h1>
                <p className="text-sm text-muted-foreground">Funds held at program banks</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-semibold">${totalBalance.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">${withdrawable.toLocaleString()} Withdrawable</p>
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-2xl font-semibold">History</h2>
            {history.length === 0 ? (
              <p className="text-muted-foreground">You have no transactions yet.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((item) => (
                  <li key={item.id} className="rounded-md border border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{item.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.channel} • {item.account}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Destination: <span className="font-medium text-foreground">{item.destination}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">${item.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.status === "Completed" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"
                        }`}
                      >
                        {item.status}
                      </span>
                      <p className="text-xs text-muted-foreground">Ref: {item.reference}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <aside className="h-fit rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-2xl font-semibold">Make a new transfer</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="mb-4 flex w-full items-center justify-between rounded-md border border-border px-3 py-3 text-left"
              >
                <span>
                  <span className="block text-sm">{transferType}</span>
                  <span className="text-xs text-muted-foreground">to Venture Flow Cash</span>
                </span>
                <ChevronDown size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Transfer Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTransferType("Deposit money")}>Deposit money</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTransferType("Withdraw money")}>Withdraw money</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTransferType("Transfer between wallets")}>Transfer between wallets</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Destination</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <span>{destination}</span>
                    <ChevronDown size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => setDestination("Fund Cash Wallet")}>Fund Cash Wallet</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDestination("Northwind Robotics")}>Northwind Robotics</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDestination("Orbital Labs")}>Orbital Labs</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDestination("Operations Reserve")}>Operations Reserve</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="transfer-amount">
                Amount (USD)
              </label>
              <input
                id="transfer-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">Tip: choose a destination startup or keep funds in the main wallet for upcoming deals.</p>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-md bg-foreground py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={amount <= 0}
            onClick={() => {
              const mappedType: CashTransaction["type"] =
                transferType === "Deposit money" ? "Deposit" : transferType === "Withdraw money" ? "Withdrawal" : "Internal transfer";
              const requestKey = `${mappedType}-${account}-${destination}-${amount}`;
              if (requestKey === lastCreatedKey) {
                setNotice("Transfer already created with the same details. Change amount or destination to create another.");
                return;
              }
              const channel: CashTransaction["channel"] = mappedType === "Internal transfer" ? "Internal ledger" : mappedType === "Deposit" ? "Bank wire" : "ACH";
              setHistory((current) => [
                {
                  id: `txn-${Date.now()}`,
                  type: mappedType,
                  account,
                  amount,
                  status: "Pending",
                  date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
                  destination,
                  channel,
                  reference: `${mappedType === "Deposit" ? "DP" : mappedType === "Withdrawal" ? "WD" : "IC"}-${Math.floor(10000 + Math.random() * 89999)}`,
                },
                ...current,
              ]);
              setLastCreatedKey(requestKey);
              setNotice("Transfer request created and added to history.");
            }}
          >
            Create transfer request ({account.split(" ")[0]})
          </button>
          {notice ? <p className="mt-2 text-xs text-muted-foreground">{notice}</p> : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="mt-6 w-full text-sm text-primary">
                Manage Banks & Cards
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Linked Accounts</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAccount("Chase •••• 4821")}>Chase •••• 4821</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAccount("Bank of America •••• 1188")}>Bank of America •••• 1188</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAccount("Wells Fargo •••• 6492")}>Wells Fargo •••• 6492</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </aside>
      </div>
    </AppShell>
  );
}
