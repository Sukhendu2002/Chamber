"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

type Expense = {
  id: string;
  amount: number;
  category: string;
  merchant?: string | null;
  description?: string | null;
  date: Date;
};

type ExpenseCalendarWidgetProps = {
  expenses: Expense[];
  currency: string;
};

export function ExpenseCalendarWidget({ expenses, currency }: ExpenseCalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Get expenses for a specific day
  const getExpensesForDay = (day: number): Expense[] => {
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return (
        expDate.getDate() === day &&
        expDate.getMonth() === month &&
        expDate.getFullYear() === year
      );
    });
  };

  // Get total for a day
  const getDayTotal = (day: number): number => {
    return getExpensesForDay(day).reduce((sum, exp) => sum + exp.amount, 0);
  };

  // Check if a day is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Category colors for dots
  const categoryColors: Record<string, string> = {
    Food: "bg-blue-500",
    Travel: "bg-green-500",
    Entertainment: "bg-yellow-500",
    Bills: "bg-red-500",
    Shopping: "bg-purple-500",
    Health: "bg-pink-500",
    Education: "bg-indigo-500",
    Investments: "bg-emerald-500",
    Subscription: "bg-orange-500",
    General: "bg-gray-500",
  };

  // Generate calendar days
  const calendarDays = [];

  // Empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(
      <div key={`empty-${i}`} className="h-10 text-center" />
    );
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayExpenses = getExpensesForDay(day);
    const dayTotal = getDayTotal(day);
    const today = isToday(day);
    const hasExpenses = dayExpenses.length > 0;

    const dayCell = (
      <div
        className={`h-10 flex flex-col items-center justify-center relative cursor-pointer ${
          today ? "bg-primary/10 rounded-full" : hasExpenses ? "hover:bg-muted/50 rounded" : ""
        }`}
      >
        <span className={`text-xs ${today ? "font-bold text-primary" : hasExpenses ? "font-medium" : "text-muted-foreground"}`}>
          {day}
        </span>
        {hasExpenses && (
          <div className="flex gap-0.5 mt-0.5">
            {dayExpenses.slice(0, 3).map((exp, idx) => (
              <div
                key={idx}
                className={`w-1 h-1 rounded-full ${categoryColors[exp.category] || "bg-gray-500"}`}
              />
            ))}
            {dayExpenses.length > 3 && (
              <span className="text-[8px] text-muted-foreground">+</span>
            )}
          </div>
        )}
      </div>
    );

    if (hasExpenses) {
      calendarDays.push(
        <Tooltip key={day}>
          <TooltipTrigger asChild>
            {dayCell}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] p-2">
            <div className="space-y-1">
              <div className="font-medium text-xs border-b pb-1 mb-1">
                {day} {monthNames[month]} - {formatCurrency(dayTotal)}
              </div>
              {dayExpenses.slice(0, 5).map((exp, idx) => (
                <div key={idx} className="flex justify-between gap-2 text-xs">
                  <span className="truncate">{exp.merchant || exp.description || exp.category}</span>
                  <span className="font-medium whitespace-nowrap">{formatCurrency(exp.amount)}</span>
                </div>
              ))}
              {dayExpenses.length > 5 && (
                <div className="text-xs text-muted-foreground">+{dayExpenses.length - 5} more</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    } else {
      calendarDays.push(<div key={day}>{dayCell}</div>);
    }
  }

  // Calculate month total
  const monthTotal = expenses
    .filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === month && expDate.getFullYear() === year;
    })
    .reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Expense Calendar</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={prevMonth}>
                <IconChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs font-medium w-16 text-center">
                {monthNames[month]} {year}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={nextMonth}>
                <IconChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {dayNames.map((day, idx) => (
              <div key={idx} className="text-center text-[10px] font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">{calendarDays}</div>
          {/* Month total */}
          <div className="mt-3 pt-3 border-t flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Month Total</span>
            <span className="text-sm font-bold">{formatCurrency(monthTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
