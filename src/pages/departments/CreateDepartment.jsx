// src/pages/departments/CreateDepartment.jsx
import React, { useState } from 'react';
import { useTranslation }   from 'react-i18next';
import { FiLayers }        from 'react-icons/fi';
import { useNavigate }     from 'react-router-dom';

const CreateDepartment = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [head, setHead] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('http://localhost:5002/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, head })
      });
      if (!res.ok) throw new Error(await res.text());
      navigate('/departments/all');
    } catch (err) {
      console.error(err);
      setError(t('departments.errorCreating'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <FiLayers className="text-indigo-600 text-4xl mr-4" />
        <h1 className="text-3xl font-bold">{t('departments.createTitle')}</h1>
      </div>

      <form 
        onSubmit={handleSubmit} 
        className="space-y-6 bg-white p-8 rounded-2xl shadow-lg"
      >
        {error && (
          <div className="text-red-600 text-center">{error}</div>
        )}

        <div>
          <label className="block mb-2 font-medium">
            {t('departments.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">
            {t('departments.head')}
          </label>
          <input
            type="text"
            value={head}
            onChange={e => setHead(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="flex justify-end space-x-4 rtl:space-x-reverse">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            {t('Back')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            {submitting
              ? t('departments.submitting')
              : t('departments.createBtn')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateDepartment;
