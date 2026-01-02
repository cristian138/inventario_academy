import React, { useState } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Download, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const [reportType, setReportType] = useState('inventory');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await api.getReports({ report_type: reportType });
      setReportData(response.data);
      toast.success('Reporte generado exitosamente');
    } catch (error) {
      toast.error('Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    let worksheet;
    if (reportType === 'inventory') {
      const data = reportData.map((item) => ({
        Nombre: item.name,
        Categoría: item.category_name,
        Descripción: item.description,
        Estado: item.status,
        'Cantidad Total': item.quantity,
        'Cantidad Disponible': item.available_quantity,
        Ubicación: item.location,
        Responsable: item.responsible,
      }));
      worksheet = XLSX.utils.json_to_sheet(data);
    } else {
      const data = [];
      reportData.forEach((assignment) => {
        assignment.details.forEach((detail) => {
          data.push({
            Instructor: assignment.instructor_name,
            Disciplina: assignment.discipline,
            Bien: detail.good_name,
            Cantidad: detail.quantity_assigned,
            Fecha: new Date(assignment.created_at).toLocaleDateString('es-ES'),
            Estado: assignment.status,
          });
        });
      });
      worksheet = XLSX.utils.json_to_sheet(data);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
    XLSX.writeFile(workbook, `reporte_${reportType}_${Date.now()}.xlsx`);
    toast.success('Reporte exportado a Excel');
  };

  const exportToPDF = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte de Inventario', 14, 20);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 30);

    if (reportType === 'inventory') {
      const tableData = reportData.map((item) => [
        item.name,
        item.category_name,
        item.status,
        item.quantity,
        item.available_quantity,
        item.location,
      ]);

      autoTable(doc, {
        head: [['Nombre', 'Categoría', 'Estado', 'Total', 'Disponible', 'Ubicación']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 175] },
      });
    } else {
      const tableData = [];
      reportData.forEach((assignment) => {
        assignment.details.forEach((detail) => {
          tableData.push([
            assignment.instructor_name,
            assignment.discipline,
            detail.good_name,
            detail.quantity_assigned,
            new Date(assignment.created_at).toLocaleDateString('es-ES'),
          ]);
        });
      });

      autoTable(doc, {
        head: [['Instructor', 'Disciplina', 'Bien', 'Cantidad', 'Fecha']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 175] },
      });
    }

    doc.save(`reporte_${reportType}_${Date.now()}.pdf`);
    toast.success('Reporte exportado a PDF');
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <h2 className="text-2xl font-bold text-slate-900">Reportes</h2>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label htmlFor="reportType">Tipo de Reporte</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger data-testid="report-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inventory">Inventario Total</SelectItem>
                <SelectItem value="assignments">Asignaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={generateReport}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="generate-report-button"
            >
              {loading ? 'Generando...' : 'Generar Reporte'}
            </Button>
          </div>
        </div>

        {reportData && reportData.length > 0 && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={exportToExcel}
                variant="outline"
                className="flex-1"
                data-testid="export-excel-button"
              >
                <FileText className="w-4 h-4 mr-2" />
                Exportar a Excel
              </Button>
              <Button
                onClick={exportToPDF}
                variant="outline"
                className="flex-1"
                data-testid="export-pdf-button"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar a PDF
              </Button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      {reportType === 'inventory' ? (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Nombre
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Categoría
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                            Total
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                            Disponible
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Ubicación
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Instructor
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Disciplina
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Bienes
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Fecha
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportType === 'inventory' ? (
                      reportData.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{item.category_name}</td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center font-semibold">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-center font-semibold text-green-600">
                            {item.available_quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{item.location}</td>
                        </tr>
                      ))
                    ) : (
                      reportData.map((assignment, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">{assignment.instructor_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{assignment.discipline}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {assignment.details.map((d) => d.good_name).join(', ')}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {new Date(assignment.created_at).toLocaleDateString('es-ES')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Total de registros: <span className="font-semibold">{reportData.length}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;