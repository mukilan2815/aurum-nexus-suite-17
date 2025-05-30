import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Plus,
  Loader,
  Calendar,
  Save,
  Trash2,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import axios from "axios";

// API client setup
const api = axios.create({
  baseURL: "https://backend-goldsmith.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Client API functions
const clientApi = {
  getClients: async (): Promise<Client[]> => {
    try {
      const response = await api.get("/clients");
      const data = response.data;
      // pick the real array
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data.clients)
        ? data.clients
        : [];
      // map to your Client interface
      return rawList.map((c: any) => ({
        id: c._id,
        name: c.clientName,
        shopName: c.shopName,
        phoneNumber: c.phoneNumber,
        address: c.address,
      }));
    } catch (error) {
      console.error("Error fetching clients:", error);
      throw error;
    }
  },

  searchClients: async (searchParams: any) => {
    try {
      const response = await api.get("/clients/search", {
        params: searchParams,
      });
      return response.data;
    } catch (error) {
      console.error("Error searching clients:", error);
      throw error;
    }
  },

  getClientById: async (id: string) => {
    try {
      const response = await api.get(`/clients/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching client ${id}:`, error);
      throw error;
    }
  },
};

// Admin Receipt API functions
const adminReceiptApi = {
  getAdminReceipts: async (clientId: string | null = null) => {
    try {
      const params = clientId ? { clientId } : {};
      const response = await api.get("/admin-receipts", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching admin receipts:", error);
      throw error;
    }
  },

  getAdminReceiptById: async (id: string) => {
    try {
      const response = await api.get(`/admin-receipts/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching admin receipt ${id}:`, error);
      throw error;
    }
  },

  createAdminReceipt: async (receiptData: any) => {
    try {
      const response = await api.post("/admin-receipts", receiptData);
      return response.data;
    } catch (error) {
      console.error("Error creating admin receipt:", error);
      throw error;
    }
  },

  updateAdminReceipt: async (id: string, receiptData: any) => {
    try {
      const response = await api.put(`/admin-receipts/${id}`, receiptData);
      return response.data;
    } catch (error) {
      console.error(`Error updating admin receipt ${id}:`, error);
      throw error;
    }
  },

  deleteAdminReceipt: async (id: string) => {
    try {
      const response = await api.delete(`/admin-receipts/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting admin receipt ${id}:`, error);
      throw error;
    }
  },

  searchAdminReceipts: async (searchParams: any) => {
    try {
      const response = await api.get("/admin-receipts/search", {
        params: searchParams,
      });
      return response.data;
    } catch (error) {
      console.error("Error searching admin receipts:", error);
      throw error;
    }
  },

  generateVoucherId: async () => {
    try {
      const response = await api.get("/admin-receipts/generate-voucher-id");
      return response.data.voucherId;
    } catch (error) {
      console.error("Error generating voucher ID:", error);
      throw error;
    }
  },
};

// Mock client data for fallback
const mockClients = [
  {
    id: "1001",
    name: "Golden Creations",
    shopName: "Golden Store",
    phoneNumber: "9845939045",
    address: "123 Gold St",
  },
  {
    id: "1002",
    name: "Silver Linings",
    shopName: "Silver Shop",
    phoneNumber: "9080705040",
    address: "456 Silver Ave",
  },
  {
    id: "1003",
    name: "Gem Masters",
    shopName: "Gem World",
    phoneNumber: "9845939045",
    address: "789 Gem Blvd",
  },
  {
    id: "1004",
    name: "Platinum Plus",
    shopName: "Platinum Gallery",
    phoneNumber: "8090847974",
    address: "101 Platinum Rd",
  },
  {
    id: "1005",
    name: "Diamond Designs",
    shopName: "Diamond Hub",
    phoneNumber: "7070707070",
    address: "202 Diamond Lane",
  },
];

// Types
interface Client {
  id: string;
  name: string;
  shopName: string;
  phoneNumber: string;
  address: string;
}

interface GivenItem {
  id: string;
  productName: string;
  pureWeight: string;
  purePercent: string;
  melting: string;
  total: number;
}

interface ReceivedItem {
  id: string;
  productName: string;
  finalOrnamentsWt: string;
  stoneWeight: string;
  makingChargePercent: string;
  subTotal: number;
  total: number;
}

export default function NewAdminReceiptPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<string>("given");
  const [isSubmittingGiven, setIsSubmittingGiven] = useState<boolean>(false);
  const [isSubmittingReceived, setIsSubmittingReceived] =
    useState<boolean>(false);
  const [voucherId, setVoucherId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [clients, setClients] = useState<Client[]>([]); // Initialize as empty array
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(false);

  // Filter states
  const [shopNameFilter, setShopNameFilter] = useState<string>("");
  const [clientNameFilter, setClientNameFilter] = useState<string>("");
  const [phoneFilter, setPhoneFilter] = useState<string>("");

  // Given items state
  const [givenDate, setGivenDate] = useState<Date>(new Date());
  const [givenItems, setGivenItems] = useState<GivenItem[]>([
    {
      id: uuidv4(),
      productName: "",
      pureWeight: "",
      purePercent: "",
      melting: "",
      total: 0,
    },
  ]);

  // Received items state
  const [receivedDate, setReceivedDate] = useState<Date>(new Date());
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([
    {
      id: uuidv4(),
      productName: "",
      finalOrnamentsWt: "",
      stoneWeight: "0",
      makingChargePercent: "",
      subTotal: 0,
      total: 0,
    },
  ]);

  // Manual calculation state
  const [manualGivenTotal, setManualGivenTotal] = useState<number>(0);
  const [manualReceivedTotal, setManualReceivedTotal] = useState<number>(0);
  const [operation, setOperation] = useState<string>("subtract-given-received");

  // Load data on component mount
  useEffect(() => {
    const initPage = async () => {
      try {
        // Generate voucher ID if not editing
        if (!id) {
          try {
            const generatedId = await adminReceiptApi.generateVoucherId();
            setVoucherId(generatedId);
          } catch (error) {
            console.error("Error generating voucher ID:", error);
            // Fallback to client-side generation
            setVoucherId(
              `GA-${new Date().getFullYear().toString().substr(-2)}${(
                new Date().getMonth() + 1
              )
                .toString()
                .padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`
            );
          }
        }

        // Load clients
        await loadClients();

        // Load receipt data if editing
        if (id) {
          await loadReceiptData(id);
        }
      } catch (error) {
        console.error("Error initializing page:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to initialize page. Please try again.",
        });
      }
    };

    initPage();
  }, [id]);

  // Load clients from API
  const loadClients = async () => {
    setIsLoadingClients(true);
    try {
      const clientsData = await clientApi.getClients();
      // Ensure clientsData is an array
      if (Array.isArray(clientsData)) {
        setClients(clientsData);
      } else {
        console.error("Clients data is not an array:", clientsData);
        // Fallback to mock data
        setClients(mockClients);
        toast({
          variant: "warning",
          title: "Warning",
          description:
            "Using mock client data due to API response format issue.",
        });
      }
    } catch (error) {
      console.error("Error loading clients:", error);
      // Fallback to mock data on error
      setClients(mockClients);
      toast({
        variant: "warning",
        title: "Warning",
        description: "Using mock client data due to API error.",
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Load receipt data for editing
  const loadReceiptData = async (receiptId: string) => {
    setIsLoading(true);
    try {
      const receipt = await adminReceiptApi.getAdminReceiptById(receiptId);

      // Set voucher ID
      if (receipt.voucherId) {
        setVoucherId(receipt.voucherId);
      }

      // Set client
      try {
        if (receipt.clientId) {
          const client = await clientApi.getClientById(receipt.clientId);
          if (client) {
            setSelectedClient(client);
          }
        }
      } catch (clientError) {
        console.error(
          `Error loading client for receipt ${receiptId}:`,
          clientError
        );
        // If client can't be loaded but we have clientName, create a partial client object
        if (receipt.clientName) {
          setSelectedClient({
            id: receipt.clientId || "unknown",
            name: receipt.clientName,
            shopName: "Unknown Shop",
            phoneNumber: "",
            address: "",
          });
        }
      }

      // Set given items
      if (receipt.given) {
        if (receipt.given.date) {
          setGivenDate(new Date(receipt.given.date));
        }
        if (
          Array.isArray(receipt.given.items) &&
          receipt.given.items.length > 0
        ) {
          setGivenItems(
            receipt.given.items.map((item: any) => ({
              ...item,
              id: item.id || uuidv4(), // Ensure each item has an ID
            }))
          );
        }
        if (typeof receipt.given.total === "number") {
          setManualGivenTotal(receipt.given.total);
        }
      }

      // Set received items
      if (receipt.received) {
        if (receipt.received.date) {
          setReceivedDate(new Date(receipt.received.date));
        }
        if (
          Array.isArray(receipt.received.items) &&
          receipt.received.items.length > 0
        ) {
          setReceivedItems(
            receipt.received.items.map((item: any) => ({
              ...item,
              id: item.id || uuidv4(), // Ensure each item has an ID
            }))
          );
        }
        if (typeof receipt.received.total === "number") {
          setManualReceivedTotal(receipt.received.total);
        }
      }
    } catch (error) {
      console.error(`Error loading receipt ${receiptId}:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load receipt data. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter clients based on all filters - with safety check
  const filteredClients = Array.isArray(clients)
    ? clients.filter((client) => {
        const matchesShopName = client.shopName
          .toLowerCase()
          .includes(shopNameFilter.toLowerCase());
        const matchesClientName = client.name
          .toLowerCase()
          .includes(clientNameFilter.toLowerCase());
        const matchesPhone = client.phoneNumber.includes(phoneFilter);

        return matchesShopName && matchesClientName && matchesPhone;
      })
    : [];

  // Select a client and proceed to the form
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
  };

  // Add a new given item
  const addGivenItem = () => {
    const newItem: GivenItem = {
      id: uuidv4(),
      productName: "",
      pureWeight: "",
      purePercent: "",
      melting: "",
      total: 0,
    };

    setGivenItems([...givenItems, newItem]);
  };

  // Remove a given item
  const removeGivenItem = (id: string) => {
    if (givenItems.length > 1) {
      setGivenItems(givenItems.filter((item) => item.id !== id));
    } else {
      toast({
        variant: "destructive",
        title: "Cannot remove",
        description: "At least one given item is required",
      });
    }
  };

  // Update given item field
  const updateGivenItem = (
    id: string,
    field: keyof GivenItem,
    value: string
  ) => {
    setGivenItems(
      givenItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate total if necessary fields are provided
          if (["pureWeight", "purePercent", "melting"].includes(field)) {
            const pureWeight = parseFloat(updatedItem.pureWeight) || 0;
            const purePercent = parseFloat(updatedItem.purePercent) || 0;
            const melting = parseFloat(updatedItem.melting) || 1;

            // Calculate as (Pure Weight * Pure Percent) / Melting
            updatedItem.total = (pureWeight * purePercent) / melting;
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  // Add a new received item
  const addReceivedItem = () => {
    const newItem: ReceivedItem = {
      id: uuidv4(),
      productName: "",
      finalOrnamentsWt: "",
      stoneWeight: "0",
      makingChargePercent: "",
      subTotal: 0,
      total: 0,
    };

    setReceivedItems([...receivedItems, newItem]);
  };

  // Remove a received item
  const removeReceivedItem = (id: string) => {
    if (receivedItems.length > 1) {
      setReceivedItems(receivedItems.filter((item) => item.id !== id));
    } else {
      toast({
        variant: "destructive",
        title: "Cannot remove",
        description: "At least one received item is required",
      });
    }
  };

  // Update received item field
  const updateReceivedItem = (
    id: string,
    field: keyof ReceivedItem,
    value: string
  ) => {
    setReceivedItems(
      receivedItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate subtotal and total if necessary fields are provided
          if (
            ["finalOrnamentsWt", "stoneWeight", "makingChargePercent"].includes(
              field
            )
          ) {
            const finalOrnamentsWt =
              parseFloat(updatedItem.finalOrnamentsWt) || 0;
            const stoneWeight = parseFloat(updatedItem.stoneWeight) || 0;
            const makingChargePercent =
              parseFloat(updatedItem.makingChargePercent) || 0;

            // Calculate SubTotal = (finalOrnamentsWt - stoneWeight)
            updatedItem.subTotal = finalOrnamentsWt - stoneWeight;

            // Calculate Total = SubTotal * (makingChargePercent / 100)
            updatedItem.total =
              updatedItem.subTotal * (makingChargePercent / 100);
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  // Calculate given totals
  const givenTotals = {
    totalPureWeight: givenItems.reduce((acc, item) => {
      const pureWeight = parseFloat(item.pureWeight) || 0;
      const purePercent = parseFloat(item.purePercent) || 0;
      return acc + (pureWeight * purePercent) / 100;
    }, 0),
    total: givenItems.reduce((acc, item) => acc + item.total, 0),
  };

  // Calculate received totals
  const receivedTotals = {
    totalOrnamentsWt: receivedItems.reduce(
      (acc, item) => acc + (parseFloat(item.finalOrnamentsWt) || 0),
      0
    ),
    totalStoneWeight: receivedItems.reduce(
      (acc, item) => acc + (parseFloat(item.stoneWeight) || 0),
      0
    ),
    totalSubTotal: receivedItems.reduce((acc, item) => acc + item.subTotal, 0),
    total: receivedItems.reduce((acc, item) => acc + item.total, 0),
  };

  // Calculate manual result
  const calculateManualResult = () => {
    switch (operation) {
      case "subtract-given-received":
        return manualGivenTotal - manualReceivedTotal;
      case "subtract-received-given":
        return manualReceivedTotal - manualGivenTotal;
      case "add":
        return manualGivenTotal + manualReceivedTotal;
      default:
        return 0;
    }
  };

  // Save Given Data
  const saveGivenData = async () => {
    if (!selectedClient) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a client first",
      });
      return;
    }

    setIsSubmittingGiven(true);

    try {
      // Validate given items
      for (const item of givenItems) {
        if (
          !item.productName ||
          !item.pureWeight ||
          !item.purePercent ||
          !item.melting
        ) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please fill all required fields for each given item",
          });
          setIsSubmittingGiven(false);
          return;
        }
      }

      const givenData = {
        date: givenDate,
        items: givenItems,
        totalPureWeight: givenTotals.totalPureWeight,
        total: givenTotals.total,
      };

      // Prepare receipt data
      const receiptData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        given: givenData,
        status: "incomplete",
      };

      // If editing, update existing receipt
      if (id) {
        await adminReceiptApi.updateAdminReceipt(id, { given: givenData });
      } else {
        // If received items exist, include them
        if (receivedItems.some((item) => item.productName)) {
          receiptData.received = {
            date: receivedDate,
            items: receivedItems,
            totalOrnamentsWt: receivedTotals.totalOrnamentsWt,
            totalStoneWeight: receivedTotals.totalStoneWeight,
            totalSubTotal: receivedTotals.totalSubTotal,
            total: receivedTotals.total,
          };
        }

        // Create new receipt
        const newReceipt = await adminReceiptApi.createAdminReceipt(
          receiptData
        );

        // Update ID for future edits
        if (newReceipt && newReceipt._id) {
          navigate(`/admin-receipts/${newReceipt._id}`, { replace: true });
        }
      }

      toast({
        title: "Success",
        description: "Given items saved successfully",
      });

      // Update manual calculation value
      setManualGivenTotal(givenTotals.total);
    } catch (error: any) {
      console.error("Error saving given data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.message || "Failed to save given items",
      });
    } finally {
      setIsSubmittingGiven(false);
    }
  };

  // Save Received Data
  const saveReceivedData = async () => {
    if (!selectedClient) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a client first",
      });
      return;
    }

    setIsSubmittingReceived(true);

    try {
      // Validate received items
      for (const item of receivedItems) {
        if (
          !item.productName ||
          !item.finalOrnamentsWt ||
          !item.makingChargePercent
        ) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description:
              "Please fill all required fields for each received item",
          });
          setIsSubmittingReceived(false);
          return;
        }
      }

      const receivedData = {
        date: receivedDate,
        items: receivedItems,
        totalOrnamentsWt: receivedTotals.totalOrnamentsWt,
        totalStoneWeight: receivedTotals.totalStoneWeight,
        totalSubTotal: receivedTotals.totalSubTotal,
        total: receivedTotals.total,
      };

      // Prepare receipt data
      const receiptData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        received: receivedData,
        status: "incomplete",
      };

      // If editing, update existing receipt
      if (id) {
        await adminReceiptApi.updateAdminReceipt(id, {
          received: receivedData,
        });
      } else {
        // If given items exist, include them
        if (givenItems.some((item) => item.productName)) {
          receiptData.given = {
            date: givenDate,
            items: givenItems,
            totalPureWeight: givenTotals.totalPureWeight,
            total: givenTotals.total,
          };
        }

        // Create new receipt
        const newReceipt = await adminReceiptApi.createAdminReceipt(
          receiptData
        );

        // Update ID for future edits
        if (newReceipt && newReceipt._id) {
          navigate(`/admin-receipts/${newReceipt._id}`, { replace: true });
        }
      }

      toast({
        title: "Success",
        description: "Received items saved successfully",
      });

      // Update manual calculation value
      setManualReceivedTotal(receivedTotals.total);
    } catch (error: any) {
      console.error("Error saving received data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.message || "Failed to save received items",
      });
    } finally {
      setIsSubmittingReceived(false);
    }
  };

  // If loading, show loading indicator
  if (isLoading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading receipt data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/admin-receipts")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Receipts
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {!selectedClient
            ? "Admin Receipt - Select Client"
            : `Admin Receipt for: ${selectedClient.name}`}
        </h1>
        <p className="text-muted-foreground">
          {selectedClient
            ? "Manage given and received items. Data will be saved to the database."
            : "Filter and select a client. Client data is loaded from the database."}
        </p>
      </div>

      {!selectedClient ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Client</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <Input
                  type="text"
                  placeholder="Filter by Shop Name"
                  value={shopNameFilter}
                  onChange={(e) => setShopNameFilter(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Filter by Client Name"
                  value={clientNameFilter}
                  onChange={(e) => setClientNameFilter(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Filter by Phone Number"
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingClients ? (
              <div className="text-center py-6">
                <Loader className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading clients...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <div key={client.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{client.name}</h3>
                          <div className="text-sm text-muted-foreground">
                            <div>Shop: {client.shopName}</div>
                            <div>Phone: {client.phoneNumber}</div>
                            <div>Address: {client.address}</div>
                          </div>
                        </div>
                        <Button
                          className="bg-yellow-400 hover:bg-yellow-500 text-black"
                          onClick={() => handleSelectClient(client)}
                        >
                          Select Client
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No clients found matching the filters
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  Admin Receipt for: {selectedClient.name}
                </CardTitle>
                <CardDescription>
                  Manage given and received items. Data will be saved to the
                  database.
                </CardDescription>
              </div>
              <div className="bg-primary/10 px-3 py-1 rounded-md text-primary font-medium">
                Voucher ID: {voucherId}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="given">Given Items</TabsTrigger>
                  <TabsTrigger value="received">Received Items</TabsTrigger>
                </TabsList>

                {/* Given Items Tab */}
                <TabsContent value="given" className="space-y-6 pt-4">
                  <div className="bg-card rounded-md border">
                    <div className="p-4 flex flex-col md:flex-row justify-between md:items-center border-b">
                      <h3 className="text-lg font-medium">
                        Given Details (Client: {selectedClient.name})
                      </h3>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full md:w-[240px] mt-2 md:mt-0 justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {givenDate ? (
                              format(givenDate, "PPP")
                            ) : (
                              <span>Pick Given Date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <CalendarComponent
                            mode="single"
                            selected={givenDate}
                            onSelect={setGivenDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="p-4">
                      <div className="space-y-4">
                        {givenItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-1 md:grid-cols-5 gap-4 p-3 border rounded-md"
                          >
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium mb-1 block">
                                Product Name
                              </label>
                              <Input
                                placeholder="Product Name"
                                value={item.productName}
                                onChange={(e) =>
                                  updateGivenItem(
                                    item.id,
                                    "productName",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Pure Weight
                              </label>
                              <Input
                                type="number"
                                placeholder="Pure Weight"
                                value={item.pureWeight}
                                onChange={(e) =>
                                  updateGivenItem(
                                    item.id,
                                    "pureWeight",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Pure %
                              </label>
                              <Input
                                type="number"
                                placeholder="Pure %"
                                value={item.purePercent}
                                onChange={(e) =>
                                  updateGivenItem(
                                    item.id,
                                    "purePercent",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Melting
                              </label>
                              <div className="flex items-center">
                                <Input
                                  type="number"
                                  placeholder="Melting"
                                  value={item.melting}
                                  onChange={(e) =>
                                    updateGivenItem(
                                      item.id,
                                      "melting",
                                      e.target.value
                                    )
                                  }
                                  className="flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeGivenItem(item.id)}
                                  className="ml-2"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <div className="md:col-span-5 flex justify-between items-center pt-2 border-t">
                              <div className="text-sm text-muted-foreground">
                                Item {index + 1}
                              </div>
                              <div className="font-medium">
                                Total: {item.total.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={addGivenItem}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                      </div>

                      <div className="mt-6 p-4 border rounded-md bg-muted/50">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">
                              Total Pure Weight:{" "}
                              {givenTotals.totalPureWeight.toFixed(2)}
                            </div>
                            <div className="font-medium mt-1">
                              Total: {givenTotals.total.toFixed(2)}
                            </div>
                          </div>
                          <Button
                            className="bg-yellow-400 hover:bg-yellow-500 text-black"
                            onClick={saveGivenData}
                            disabled={isSubmittingGiven}
                          >
                            {isSubmittingGiven ? (
                              <>
                                <Loader className="mr-2 h-4 w-4 animate-spin" />{" "}
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" /> Save Given
                                Items
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Received Items Tab */}
                <TabsContent value="received" className="space-y-6 pt-4">
                  <div className="bg-card rounded-md border">
                    <div className="p-4 flex flex-col md:flex-row justify-between md:items-center border-b">
                      <h3 className="text-lg font-medium">
                        Received Details (Client: {selectedClient.name})
                      </h3>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full md:w-[240px] mt-2 md:mt-0 justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {receivedDate ? (
                              format(receivedDate, "PPP")
                            ) : (
                              <span>Pick Received Date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <CalendarComponent
                            mode="single"
                            selected={receivedDate}
                            onSelect={setReceivedDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="p-4">
                      <div className="space-y-4">
                        {receivedItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-1 md:grid-cols-5 gap-4 p-3 border rounded-md"
                          >
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium mb-1 block">
                                Product Name
                              </label>
                              <Input
                                placeholder="Product Name"
                                value={item.productName}
                                onChange={(e) =>
                                  updateReceivedItem(
                                    item.id,
                                    "productName",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Final Ornaments Wt
                              </label>
                              <Input
                                type="number"
                                placeholder="Final Ornaments Wt"
                                value={item.finalOrnamentsWt}
                                onChange={(e) =>
                                  updateReceivedItem(
                                    item.id,
                                    "finalOrnamentsWt",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Stone Weight
                              </label>
                              <Input
                                type="number"
                                placeholder="Stone Weight"
                                value={item.stoneWeight}
                                onChange={(e) =>
                                  updateReceivedItem(
                                    item.id,
                                    "stoneWeight",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Making Charge %
                              </label>
                              <div className="flex items-center">
                                <Input
                                  type="number"
                                  placeholder="Making Charge %"
                                  value={item.makingChargePercent}
                                  onChange={(e) =>
                                    updateReceivedItem(
                                      item.id,
                                      "makingChargePercent",
                                      e.target.value
                                    )
                                  }
                                  className="flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeReceivedItem(item.id)}
                                  className="ml-2"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <div className="md:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                              <div className="text-sm text-muted-foreground">
                                Item {index + 1}
                              </div>
                              <div className="text-right">
                                <div className="text-sm">
                                  SubTotal: {item.subTotal.toFixed(2)}
                                </div>
                                <div className="font-medium">
                                  Total: {item.total.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={addReceivedItem}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                      </div>

                      <div className="mt-6 p-4 border rounded-md bg-muted/50">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm">
                              Total Ornaments Wt:{" "}
                              {receivedTotals.totalOrnamentsWt.toFixed(2)}
                            </div>
                            <div className="text-sm">
                              Total Stone Weight:{" "}
                              {receivedTotals.totalStoneWeight.toFixed(2)}
                            </div>
                            <div className="text-sm">
                              Total SubTotal:{" "}
                              {receivedTotals.totalSubTotal.toFixed(2)}
                            </div>
                            <div className="font-medium mt-1">
                              Total: {receivedTotals.total.toFixed(2)}
                            </div>
                          </div>
                          <Button
                            className="bg-yellow-400 hover:bg-yellow-500 text-black"
                            onClick={saveReceivedData}
                            disabled={isSubmittingReceived}
                          >
                            {isSubmittingReceived ? (
                              <>
                                <Loader className="mr-2 h-4 w-4 animate-spin" />{" "}
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" /> Save Received
                                Items
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Manual Calculation Card */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Calculation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Given Total
                  </label>
                  <Input
                    type="number"
                    value={manualGivenTotal}
                    onChange={(e) =>
                      setManualGivenTotal(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Operation
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    value={operation}
                    onChange={(e) => setOperation(e.target.value)}
                  >
                    <option value="subtract-given-received">
                      Given - Received
                    </option>
                    <option value="subtract-received-given">
                      Received - Given
                    </option>
                    <option value="add">Given + Received</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Received Total
                  </label>
                  <Input
                    type="number"
                    value={manualReceivedTotal}
                    onChange={(e) =>
                      setManualReceivedTotal(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="mt-6 p-4 border rounded-md bg-muted/50">
                <div className="flex justify-between items-center">
                  <div className="font-medium">Result:</div>
                  <div className="text-xl font-bold">
                    {calculateManualResult().toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
