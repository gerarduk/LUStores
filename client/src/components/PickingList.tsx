/**
 * @fileoverview Picking List Component
 * 
 * Generates a printable picking list for warehouse staff to collect items.
 * Features:
 * - Item locations displayed prominently
 * - Checkboxes for tracking picked items
 * - Optimized layout for printing
 * - Clear instructions for staff
 * - Recipient selection (from authorized users or manual entry)
 * 
 * @module client/components/PickingList
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, MapPin, Package, UserPlus, ChevronDown, ChevronUp } from "lucide-react";

interface PickingListItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  unit?: string;
  location?: string;
  category?: string;
}

interface AuthorizedUser {
  id: number;
  chargeCode: string;
  userName: string;
  email?: string;
  department?: string;
  notes?: string;
}

interface PickingListProps {
  items: PickingListItem[];
  saleId?: string;
  quoteId?: string;
  chargeCode?: string;
  customerNotes?: string;
  authorizedUsers?: AuthorizedUser[];
  onPrint?: () => void;
  onRecipientSelected?: (userName: string, email?: string) => void;
  selectedRecipient?: string | null;
}

export default function PickingList({
  items,
  saleId,
  quoteId,
  chargeCode,
  customerNotes,
  authorizedUsers,
  onPrint,
  onRecipientSelected,
  selectedRecipient
}: PickingListProps) {
  const [manualRecipientName, setManualRecipientName] = useState("");
  const [manualRecipientEmail, setManualRecipientEmail] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showPickingInstructions, setShowPickingInstructions] = useState(false);
  
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    }
    window.print();
  };

  // Group items by location for efficient picking
  const itemsByLocation = items.reduce((acc, item) => {
    const location = item.location || "Unknown Location";
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(item);
    return acc;
  }, {} as Record<string, PickingListItem[]>);

  const locationOrder = Object.keys(itemsByLocation).sort();

  return (
    <>
      {/* Screen View */}
      <Card className="picking-list-screen">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Picking List</span>
            </div>
            <Button onClick={handlePrint} className="no-print">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Header Information */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
              {saleId && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Sale ID:</span>
                  <p className="text-lg font-semibold">{saleId}</p>
                </div>
              )}
              {quoteId && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Quote ID:</span>
                  <p className="text-lg font-semibold">{quoteId}</p>
                </div>
              )}
              {chargeCode && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Charge Code:</span>
                  <p className="text-lg font-semibold">{chargeCode}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-500">Total Items:</span>
                <p className="text-lg font-semibold">{items.length}</p>
              </div>
            </div>

            {customerNotes && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{customerNotes}</p>
              </div>
            )}

            {/* Items Grouped by Location */}
            <div className="space-y-4">
              {locationOrder.map(location => (
                <div key={location} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <MapPin className="h-4 w-4 text-university-blue" />
                    <h3 className="font-semibold text-lg">{location}</h3>
                    <span className="text-sm text-gray-500">
                      ({itemsByLocation[location].length} {itemsByLocation[location].length === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {itemsByLocation[location].map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-gray-300 text-university-blue focus:ring-university-blue"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            SKU: {item.sku} {item.category && `• ${item.category}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {item.quantity} {item.unit || 'pcs'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Instructions - Collapsible */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
              <button
                type="button"
                className="w-full p-3 flex items-center justify-between text-left hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                onClick={() => setShowPickingInstructions(!showPickingInstructions)}
              >
                <span className="font-medium text-amber-900 dark:text-amber-100 flex items-center">
                  <span className="mr-2">📋</span> Picking Instructions
                </span>
                {showPickingInstructions ? (
                  <ChevronUp className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                )}
              </button>
              {showPickingInstructions && (
                <div className="px-4 pb-4">
                  <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                    <li>Check off each item as you collect it</li>
                    <li>Items are grouped by location for efficiency</li>
                    <li>Verify SKU matches the item you're picking</li>
                    <li>Report any discrepancies to the manager</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Authorized Users for Charge Code - Clickable Selection */}
            {authorizedUsers && authorizedUsers.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="font-medium text-green-900 dark:text-green-100 mb-3">
                  ✅ Authorized Users for Charge Code {chargeCode}:
                </p>
                {selectedRecipient && (
                  <div className="mb-3 p-2 bg-green-100 dark:bg-green-800/30 rounded border border-green-300 dark:border-green-700">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      📦 Delivered to: {selectedRecipient}
                    </p>
                  </div>
                )}
                {!selectedRecipient && onRecipientSelected && (
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    Click a name below to confirm who received these items, or enter a name manually:
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {authorizedUsers.map((user) => (
                    <Button
                      key={user.id}
                      variant={selectedRecipient === user.userName ? "default" : "outline"}
                      className={`justify-start text-left h-auto py-3 px-4 ${
                        selectedRecipient === user.userName
                          ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                          : 'hover:bg-green-100 dark:hover:bg-green-900/40 border-green-300 dark:border-green-700'
                      } ${!onRecipientSelected ? 'cursor-default' : ''}`}
                      onClick={() => {
                        if (onRecipientSelected && !selectedRecipient) {
                          onRecipientSelected(user.userName, user.email);
                        }
                      }}
                      disabled={!!selectedRecipient || !onRecipientSelected}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="font-medium flex items-center">
                          {selectedRecipient === user.userName && (
                            <span className="mr-2">✓</span>
                          )}
                          {user.userName}
                        </div>
                        {user.email && (
                          <div className="text-xs opacity-80">
                            {user.email}
                          </div>
                        )}
                        {user.department && (
                          <div className="text-xs opacity-70">
                            {user.department}
                          </div>
                        )}
                        {user.notes && (
                          <div className="text-xs opacity-60 italic mt-1">
                            {user.notes}
                          </div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
                
                {/* Manual entry option when there are authorized users */}
                {!selectedRecipient && onRecipientSelected && (
                  <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
                    {!showManualEntry ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowManualEntry(true)}
                        className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-600 hover:bg-green-100 dark:hover:bg-green-900/40"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Enter a different name
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="manualName" className="text-sm text-green-800 dark:text-green-200">
                            Recipient Name *
                          </Label>
                          <Input
                            id="manualName"
                            value={manualRecipientName}
                            onChange={(e) => setManualRecipientName(e.target.value)}
                            placeholder="Enter recipient name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="manualEmail" className="text-sm text-green-800 dark:text-green-200">
                            Email (optional)
                          </Label>
                          <Input
                            id="manualEmail"
                            type="email"
                            value={manualRecipientEmail}
                            onChange={(e) => setManualRecipientEmail(e.target.value)}
                            placeholder="Enter email address"
                            className="mt-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              if (manualRecipientName.trim()) {
                                onRecipientSelected(manualRecipientName.trim(), manualRecipientEmail.trim() || undefined);
                              }
                            }}
                            disabled={!manualRecipientName.trim()}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Confirm Recipient
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowManualEntry(false);
                              setManualRecipientName("");
                              setManualRecipientEmail("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fallback: Manual recipient entry when no authorized users are available */}
            {(!authorizedUsers || authorizedUsers.length === 0) && onRecipientSelected && !selectedRecipient && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                  👤 Record who received these items:
                </p>
                {!showManualEntry ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowManualEntry(true)}
                    className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Enter Recipient Name
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="manualRecipientName" className="text-sm text-blue-800 dark:text-blue-200">
                        Recipient Name *
                      </Label>
                      <Input
                        id="manualRecipientName"
                        value={manualRecipientName}
                        onChange={(e) => setManualRecipientName(e.target.value)}
                        placeholder="Enter recipient name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="manualRecipientEmail2" className="text-sm text-blue-800 dark:text-blue-200">
                        Email (optional)
                      </Label>
                      <Input
                        id="manualRecipientEmail2"
                        type="email"
                        value={manualRecipientEmail}
                        onChange={(e) => setManualRecipientEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (manualRecipientName.trim()) {
                            onRecipientSelected(manualRecipientName.trim(), manualRecipientEmail.trim() || undefined);
                          }
                        }}
                        disabled={!manualRecipientName.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Confirm Recipient
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowManualEntry(false);
                          setManualRecipientName("");
                          setManualRecipientEmail("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Show when recipient has been selected */}
            {selectedRecipient && (
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg border border-green-300 dark:border-green-700">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✓ 📦 Delivery recorded for: {selectedRecipient}
                </p>
              </div>
            )}

            {/* Manual entry when NO authorized users exist */}
            {(!authorizedUsers || authorizedUsers.length === 0) && onRecipientSelected && !selectedRecipient && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                  📝 Record who received these items:
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="recipientName" className="text-sm text-blue-800 dark:text-blue-200">
                      Recipient Name *
                    </Label>
                    <Input
                      id="recipientName"
                      value={manualRecipientName}
                      onChange={(e) => setManualRecipientName(e.target.value)}
                      placeholder="Enter name of person collecting items"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipientEmail" className="text-sm text-blue-800 dark:text-blue-200">
                      Email (optional)
                    </Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      value={manualRecipientEmail}
                      onChange={(e) => setManualRecipientEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (manualRecipientName.trim()) {
                        onRecipientSelected(manualRecipientName.trim(), manualRecipientEmail.trim() || undefined);
                      }
                    }}
                    disabled={!manualRecipientName.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Confirm Recipient
                  </Button>
                </div>
              </div>
            )}

            {/* Show confirmed recipient when no authorized users */}
            {(!authorizedUsers || authorizedUsers.length === 0) && selectedRecipient && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="p-2 bg-green-100 dark:bg-green-800/30 rounded border border-green-300 dark:border-green-700">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    📦 Delivered to: {selectedRecipient}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print, .sidebar, .topbar, header, nav {
            display: none !important;
          }
          
          body {
            background: white;
          }
          
          .picking-list-screen {
            box-shadow: none;
            border: none;
            max-width: 100%;
          }
          
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </>
  );
}
