
import React, { useState } from 'react';
import { Level, Student, Representative } from '../types';
import { SECTIONS } from '../constants';
import { dataService } from '../services/dataService';
import { UserPlus, Plus, Trash2, Save } from 'lucide-react';

const StudentRegistry: React.FC = () => {
  const [repData, setRepData] = useState({
    cedula: '',
    name: '',
  });
  const [students, setStudents] = useState<Student[]>([
    { name: '', level: Level.PRIMARIA, section: 'A' }
  ]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleAddStudent = () => {
    setStudents([...students, { name: '', level: Level.PRIMARIA, section: 'A' }]);
  };

  const handleRemoveStudent = (index: number) => {
    setStudents(students.filter((_, i) => i !== index));
  };

  const handleStudentChange = (index: number, field: keyof Student, value: string) => {
    const updated = [...students];
    updated[index] = { ...updated[index], [field]: value };
    setStudents(updated);
  };

  const generateMatricula = (cedula: string) => {
    const nextYear = new Date().getFullYear() + 1;
    const yearSuffix = `${nextYear - 1}-${nextYear.toString().slice(-2)}`;
    return `mat-${yearSuffix}-${cedula}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repData.cedula || !repData.name || students.some(s => !s.name)) {
      setMessage({ text: 'Por favor complete todos los campos obligatorios.', type: 'error' });
      return;
    }

    const matricula = generateMatricula(repData.cedula);
    const newRep: Representative = {
      cedula: repData.cedula,
      name: repData.name,
      matricula,
      students
    };

    dataService.saveRepresentative(newRep);
    setMessage({ text: `Registro exitoso. Matrícula asignada: ${matricula}`, type: 'success' });
    
    setRepData({ cedula: '', name: '' });
    setStudents([{ name: '', level: Level.PRIMARIA, section: 'A' }]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="bg-slate-900 p-2 rounded-xl text-white shadow-lg">
          <UserPlus size={24} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Registro Académico</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="card-stylized p-8 rounded-2xl border border-white">
          <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-6 h-px bg-blue-600 opacity-30"></span>
            Datos del Representante Legal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cédula de Identidad</label>
              <input 
                type="text" 
                value={repData.cedula}
                onChange={(e) => setRepData({ ...repData, cedula: e.target.value })}
                className="w-full px-4 py-3 bg-slate-100/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-inner"
                placeholder="Ej: 12345678"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</label>
              <input 
                type="text" 
                value={repData.name}
                onChange={(e) => setRepData({ ...repData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-100/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-inner"
                placeholder="Nombre y Apellido"
                required
              />
            </div>
          </div>
        </section>

        <section className="card-stylized p-8 rounded-2xl border border-white">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-6 h-px bg-blue-600 opacity-30"></span>
              Alumnos a Inscribir
            </h3>
            <button 
              type="button"
              onClick={handleAddStudent}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest border-b border-dashed border-slate-300 hover:border-blue-600"
            >
              <Plus size={14} /> Agregar Alumno
            </button>
          </div>
          
          <div className="space-y-8">
            {students.map((student, index) => (
              <div key={index} className="relative p-6 bg-slate-50/50 rounded-2xl border border-slate-200/60 flex flex-col md:flex-row gap-6 items-end group">
                {students.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveStudent(index)}
                    className="absolute -top-3 -right-3 bg-white text-rose-500 p-2 rounded-xl shadow-lg border border-slate-100 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                
                <div className="flex-1 w-full space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombres y Apellidos del Estudiante</label>
                  <input 
                    type="text" 
                    value={student.name}
                    onChange={(e) => handleStudentChange(index, 'name', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                    required
                  />
                </div>

                <div className="w-full md:w-56 space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Nivel Académico</label>
                  <select 
                    value={student.level}
                    onChange={(e) => handleStudentChange(index, 'level', e.target.value as Level)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all appearance-none cursor-pointer"
                  >
                    {Object.values(Level).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                  </select>
                </div>

                <div className="w-full md:w-32 space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Sección</label>
                  <select 
                    value={student.section}
                    onChange={(e) => handleStudentChange(index, 'section', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all appearance-none cursor-pointer"
                  >
                    {SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>

        {message && (
          <div className={`p-4 rounded-xl text-xs font-black uppercase tracking-widest text-center animate-in zoom-in-95 duration-300 ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-end">
          <button 
            type="submit"
            className="button-metallic text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl flex items-center gap-3"
          >
            <Save size={18} /> Finalizar Inscripción
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentRegistry;
