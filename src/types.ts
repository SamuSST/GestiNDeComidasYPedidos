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

export type Purchase = {
  id: string;
  name: string;
  price: number;
};

export type Service = {
  id: string;
  date: string;
  shift: "Almuerzo" | "Cena";
  items: MenuItem[];
  orders: Order[];
  /** Lo que se compró para este servicio y cuánto costó. */
  purchases?: Purchase[];
};

export type Loan = {
  id: string;
  lender: string;
  amount: number;
  date: string;
  note: string;
  returned: boolean;
};
