
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { PaymentRecord, Representative } from '../types';

export const pdfService = {
  generateReport: (title: string, headers: string[], data: any[][], fileName: string, footer?: any[][]) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Colegio Beltrán Prieto Figueroa', 14, 20);
    doc.setFontSize(12);
    doc.text(title, 14, 30);
    doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 14, 38);

    // @ts-ignore
    doc.autoTable({
      startY: 45,
      head: [headers],
      body: data,
      foot: footer,
      theme: 'striped',
      headStyles: { fillStyle: [41, 128, 185] },
      footStyles: { fillStyle: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' }
    });

    doc.save(`${fileName}.pdf`);
  }
};
