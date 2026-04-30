import React, { useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Download, Printer } from "lucide-react";

interface QRCodeGeneratorProps {
  sku: string;
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function QRCodeGenerator({ sku, itemName, isOpen, onClose }: QRCodeGeneratorProps) {
  const [qrCodeDataUrl, setQRCodeDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateQRCode = async () => {
    setIsGenerating(true);
    try {
      // Generate QR code containing the SKU
      const dataUrl = await QRCode.toDataURL(sku, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQRCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `qr-code-${sku}.png`;
    link.href = qrCodeDataUrl;
    link.click();
    
    toast({
      title: "Success",
      description: "QR code downloaded successfully",
    });
  };

  const printLabel = () => {
    if (!qrCodeDataUrl) return;

    // Create a printable label with QR code and item information
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Item Label - ${sku}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .label {
              border: 2px solid #000;
              padding: 20px;
              width: 300px;
              text-align: center;
              background: white;
            }
            .qr-code {
              margin: 10px 0;
            }
            .item-name {
              font-size: 16px;
              font-weight: bold;
              margin: 10px 0;
              word-wrap: break-word;
            }
            .sku {
              font-size: 14px;
              margin: 5px 0;
              font-family: monospace;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .label { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="item-name">${itemName}</div>
            <div class="qr-code">
              <img src="${qrCodeDataUrl}" alt="QR Code for ${sku}" width="200" height="200">
            </div>
            <div class="sku">SKU: ${sku}</div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    
    toast({
      title: "Success",
      description: "Label sent to printer",
    });
  };

  // Generate QR code when dialog opens
  React.useEffect(() => {
    if (isOpen && !qrCodeDataUrl) {
      generateQRCode();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code for {itemName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4">
          {isGenerating ? (
            <div className="flex items-center justify-center h-64 w-64 bg-gray-100 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : qrCodeDataUrl ? (
            <div className="bg-card p-4 rounded-lg border border-border">
              <img 
                src={qrCodeDataUrl} 
                alt={`QR Code for ${sku}`} 
                className="w-64 h-64"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 w-64 bg-gray-100 rounded-lg">
              <span className="text-gray-500">Failed to generate QR code</span>
            </div>
          )}
          
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">SKU: {sku}</p>
            <p className="text-xs text-gray-500">Scan this QR code to access item information</p>
          </div>
          
          {qrCodeDataUrl && (
            <div className="flex gap-2 w-full">
              <Button
                onClick={downloadQRCode}
                className="flex-1"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={printLabel}
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Label
              </Button>
            </div>
          )}
          
          <Button
            onClick={generateQRCode}
            variant="ghost"
            size="sm"
            disabled={isGenerating}
          >
            Regenerate QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
