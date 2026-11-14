export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  buyQty: number;
  buyPrice: number;
  usedQty: number;
};

export type MenuItem = {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  price: number;
  ingredients?: Ingredient[];
};

export type Order = {
  id: string;
  customer: string;
  itemId: string;
  quantity: number;
  paid: boolean;
};

export type Service = {
  id: string;
  date: string;
  shift: "Almuerzo" | "Cena";
  items: MenuItem[];
  orders: Order[];
};

export type Loan = {
  id: string;
  lender: string;
  amount: number;
  date: string;
  note: string;
  returned: boolean;
};
