import React, { useRef, useState } from 'react';
import {
  Upload,
  Loader2,
  ExternalLink,
  Trash2,
  Plus,
  Info,
} from 'lucide-react';
import { uploadFileToStorage } from '../../../firebase/storage';
import type {
  CmsCardItem,
  CmsContact,
  CmsCoordinatorInfo,
  CmsCoordinatorPerson,
  CmsDownload,
  CmsEventDetails,
  CmsFaq,
  CmsGalleryItem,
  CmsHero,
  CmsJudgingCriterion,
  CmsPrize,
  CmsRule,
  CmsScheduleItem,
  CmsSection,
  CmsSponsor,
  CmsStatItem,
  CmsEventStatus,
} from '../types';
import { CmsField, CmsInput, CmsTextArea, CmsSelect, CmsImageField } from '../fields';
import { SmartImage } from '../../ui/SmartImage';
import { CmsItemList } from '../listEditor';
import { RichTextEditor } from '../RichTextEditor';
import { createCmsId } from '../types';
import {
  CATEGORIES,
  STATUSES,
  DIFFICULTY,
  DETAIL_FIELDS,
  QUICK_REQUIREMENTS,
  PRIZE_LABELS,
  GALLERY_CATEGORIES,
  DOWNLOAD_TYPES,
  CONTACT_FIELDS,
} from './constants';

export const SectionEditor: React.FC<{
  section: CmsSection;
  eventId: string;
  onChange: (patch: any) => void;
}> = ({ section, eventId, onChange }) => {
  switch (section.sectionType) {
    case 'hero':
      return <HeroEditor content={section.content} onChange={onChange} />;
    case 'details':
      return <DetailsEditor content={section.content} onChange={onChange} />;
    case 'about':
    case 'richText':
      return (
        <RichTextEditor
          value={section.content.html}
          onChange={(html) => onChange({ html })}
          placeholder="Write your content here..."
          canEdit
        />
      );
    case 'rules':
      return (
        <CmsItemList<CmsRule>
          items={section.content.items}
          onChange={(items) => onChange({ items })}
          createItem={() => ({ id: createCmsId(), text: '' })}
          idKey={(r) => r.id}
          addLabel="Add Rule"
          emptyText="No rules added yet."
          renderEditor={(item, update) => (
            <CmsInput value={item.text} onChange={(e) => update({ text: e.target.value })} placeholder="Enter rule..." />
          )}
          renderView={(item, index) => (
            <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="w-5 h-5 rounded-md bg-violet-500/20 text-violet-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <span className="text-xs text-white/85 leading-relaxed">{item.text}</span>
            </div>
          )}
        />
      );
    case 'requirements':
      return (
        <RequirementsEditor
          items={section.content.items}
          onChange={(items) => onChange({ items })}
        />
      );
    case 'prizes':
      return (
        <CmsItemList<CmsPrize>
          items={section.content.items}
          onChange={(items) => onChange({ items })}
          createItem={() => ({ id: createCmsId(), label: 'Prize', description: '' })}
          idKey={(p) => p.id}
          addLabel="Add Prize"
          emptyText="No prizes listed yet."
          renderEditor={(item, update) => (
            <>
              <CmsField label="Prize Label">
                <CmsInput value={item.label} onChange={(e) => update({ label: e.target.value })} placeholder="e.g. 1st Prize" list="cms-prize-labels" />
                <datalist id="cms-prize-labels">
                  {PRIZE_LABELS.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </CmsField>
              <CmsField label="Description">
                <CmsInput value={item.description} onChange={(e) => update({ description: e.target.value })} placeholder="e.g. ₹5,000 + Certificate" />
              </CmsField>
            </>
          )}
          renderView={(item) => (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-xs font-bold text-white">{item.label}</span>
              {item.description && <span className="text-[11px] text-white/60 truncate">{item.description}</span>}
            </div>
          )}
        />
      );
    case 'judging':
      return (
        <CmsItemList<CmsJudgingCriterion>
          items={section.content.items}
          onChange={(items) => onChange({ items })}
          createItem={() => ({ id: createCmsId(), criterion: '', percentage: 0 })}
          idKey={(c) => c.id}
          addLabel="Add Criterion"
          emptyText="No judging criteria yet."
          renderEditor={(item, update) => (
            <div className="flex gap-2">
              <CmsInput value={item.criterion} onChange={(e) => update({ criterion: e.target.value })} placeholder="e.g. Logic" />
              <div className="w-24 flex-shrink-0 flex items-center gap-1">
                <CmsInput
                  type="number"
                  min={0}
                  max={100}
                  value={item.percentage}
                  onChange={(e) => update({ percentage: Number(e.target.value) })}
                />
                <span className="text-[11px] text-white/50 font-bold">%</span>
              </div>
            </div>
          )}
          renderView={(item, index) => (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-xs font-semibold text-white">
                {index + 1}. {item.criterion}
              </span>
              <span className="text-xs font-mono text-violet-300">{item.percentage}%</span>
            </div>
          )}
        />
      );
    case 'timeline':
      return (
        <CmsItemList<CmsScheduleItem>
          items={section.content.items}
          onChange={(items) => onChange({ items })}
          createItem={() => ({ id: createCmsId(), time: '', title: '', description: '' })}
          idKey={(s) => s.id}
          addLabel="Add Schedule Entry"
          emptyText="No schedule entries yet."
          renderEditor={(item, update) => (
            <>
              <div className="flex gap-2">
                <div className="w-32 flex-shrink-0">
                  <CmsInput value={item.time} onChange={(e) => update({ time: e.target.value })} placeholder="Time" />
                </div>
                <CmsInput value={item.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Round 1" />
              </div>
              <CmsInput value={item.description} onChange={(e) => update({ description: e.target.value })} placeholder="Description (optional)" />
            </>
          )}
          renderView={(item, index) => (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              {item.time && <span className="text-[10px] font-mono font-bold text-violet-300">{item.time}</span>}
              <span className="text-xs font-bold text-white">
                {index + 1}. {item.title}
              </span>
            </div>
          )}
        />
      );
    case 'faq':
      return (
        <CmsItemList<CmsFaq>
          items={section.content.items}
          onChange={(items) => onChange({ items })}
          createItem={() => ({ id: createCmsId(), question: '', answer: '' })}
          idKey={(f) => f.id}
          addLabel="Add FAQ"
          emptyText="No FAQs yet."
          renderEditor={(item, update) => (
            <>
              <CmsField label="Question">
                <CmsInput value={item.question} onChange={(e) => update({ question: e.target.value })} placeholder="Enter question" />
              </CmsField>
              <CmsField label="Answer">
                <CmsTextArea rows={2} value={item.answer} onChange={(e) => update({ answer: e.target.value })} placeholder="Enter answer" />
              </CmsField>
            </>
          )}
          renderView={(item) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-xs font-semibold text-white">{item.question}</span>
              {item.answer && <p className="mt-1 text-[11px] text-white/60 leading-relaxed">{item.answer}</p>}
            </div>
          )}
        />
      );
    case 'coordinator':
      return <CoordinatorEditor content={section.content} onChange={onChange} />;
    case 'downloads':
      return (
        <CmsItemList<CmsDownload>
          items={section.content.items}
          onChange={(items) => onChange({ items })}
          createItem={() => ({ id: createCmsId(), name: '', type: 'Rulebook', url: '' })}
          idKey={(d) => d.id}
          addLabel="Add Download"
          emptyText="No downloads yet."
          renderEditor={(item, update) => (
            <>
              <div className="flex gap-2">
                <CmsInput value={item.name} onChange={(e) => update({ name: e.target.value })} placeholder="File name" />
                <div className="w-36 flex-shrink-0">
                  <CmsSelect value={item.type} onChange={(e) => update({ type: e.target.value })}>
                    {DOWNLOAD_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-zinc-900">
                        {t}
                      </option>
                    ))}
                  </CmsSelect>
                </div>
              </div>
              <CmsFileField value={item.url} onChange={(url) => update({ url })} storagePrefix={`cms/${eventId}/downloads`} />            </>
          )}
          renderView={(item) => (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-xs font-bold text-white truncate">{item.name}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{item.type}</span>
            </div>
          )}
        />
      );
    case 'gallery':
      return (
        <CmsItemList<CmsGalleryItem>
          items={section.content.items}
          onChange={(items) => onChange({ items })}
          createItem={() => ({ id: createCmsId(), url: '', caption: '', category: 'Images' })}
          idKey={(g) => g.id}
          addLabel="Add Image"
          emptyText="No gallery images yet."
          renderEditor={(item, update) => (
            <>
              <CmsImageField value={item.url} onChange={(url) => update({ url })} canEdit />
              <div className="flex gap-2">
                <CmsInput value={item.caption} onChange={(e) => update({ caption: e.target.value })} placeholder="Caption" />
                <div className="w-36 flex-shrink-0">
                  <CmsSelect value={item.category} onChange={(e) => update({ category: e.target.value })}>
                    {GALLERY_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-zinc-900">
                        {c}
                      </option>
                    ))}
                  </CmsSelect>
                </div>
              </div>
            </>
          )}
          renderView={(item) => (
            <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]">
              <SmartImage src={item.url} alt={item.caption || item.category} className="w-full aspect-video" placeholder="Loading…" />
            </div>
          )}
        />
      );
    case 'sponsors':
      return (
        <CmsItemList<CmsSponsor>
          items={section.content.items}
          onChange={(items) => onChange({ items })}
          createItem={() => ({ id: createCmsId(), name: '', logoUrl: '', website: '', description: '' })}
          idKey={(s) => s.id}
          addLabel="Add Sponsor"
          emptyText="No sponsors yet."
          renderEditor={(item, update) => (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CmsInput value={item.name} onChange={(e) => update({ name: e.target.value })} placeholder="Sponsor name" />
                <CmsInput value={item.website} onChange={(e) => update({ website: e.target.value })} placeholder="Website URL" />
              </div>
              <CmsImageField value={item.logoUrl} onChange={(url) => update({ logoUrl: url })} aspect="aspect-video" canEdit />
              <CmsTextArea rows={2} value={item.description} onChange={(e) => update({ description: e.target.value })} placeholder="Description" />
            </>
          )}
          renderView={(item) => (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-xs font-bold text-white">{item.name}</span>
              {item.description && <span className="text-[11px] text-white/60 truncate">{item.description}</span>}
            </div>
          )}
        />
      );
    case 'contact':
      return <ContactEditor content={section.content} onChange={onChange} />;
    case 'heading':
      return (
        <div className="flex flex-col gap-4">
          <CmsField label="Heading Text">
            <CmsInput value={section.content.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Enter heading text" />
          </CmsField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CmsField label="Level">
              <CmsSelect value={section.content.level} onChange={(e) => onChange({ level: e.target.value })}>
                <option value="h2" className="bg-zinc-900">Heading 2</option>
                <option value="h3" className="bg-zinc-900">Heading 3</option>
              </CmsSelect>
            </CmsField>
            <CmsField label="Alignment">
              <CmsSelect value={section.content.align} onChange={(e) => onChange({ align: e.target.value })}>
                <option value="left" className="bg-zinc-900">Left</option>
                <option value="center" className="bg-zinc-900">Center</option>
              </CmsSelect>
            </CmsField>
          </div>
        </div>
      );
    case 'image':
      return (
        <div className="flex flex-col gap-4">
          <CmsImageField value={section.content.url} onChange={(url) => onChange({ url })} canEdit />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CmsField label="Caption">
              <CmsInput value={section.content.caption} onChange={(e) => onChange({ caption: e.target.value })} placeholder="Caption (optional)" />
            </CmsField>
            <CmsField label="Alt Text">
              <CmsInput value={section.content.alt} onChange={(e) => onChange({ alt: e.target.value })} placeholder="Accessibility text (optional)" />
            </CmsField>
          </div>
          <CmsField label="Aspect Ratio">
            <CmsSelect value={section.content.aspect} onChange={(e) => onChange({ aspect: e.target.value })}>
              <option value="aspect-video" className="bg-zinc-900">16:9 Video</option>
              <option value="aspect-square" className="bg-zinc-900">1:1 Square</option>
              <option value="aspect-[4/3]" className="bg-zinc-900">4:3</option>
              <option value="aspect-[16/9]" className="bg-zinc-900">16:9</option>
            </CmsSelect>
          </CmsField>
        </div>
      );
    case 'video':
      return (
        <div className="flex flex-col gap-4">
          <CmsField label="Video URL" hint="YouTube, Vimeo or direct embed link">
            <CmsInput value={section.content.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
          </CmsField>
          <CmsField label="Caption">
            <CmsInput value={section.content.caption} onChange={(e) => onChange({ caption: e.target.value })} placeholder="Caption (optional)" />
          </CmsField>
        </div>
      );
    case 'cards':
      return (
        <CmsItemList<CmsCardItem>
          items={section.content.items}
          onChange={(items) => onChange({ items })}
          createItem={() => ({ id: createCmsId(), title: '', description: '' })}
          idKey={(c) => c.id}
          addLabel="Add Card"
          emptyText="No cards added yet."
          renderEditor={(item, update) => (
            <>
              <CmsInput value={item.title} onChange={(e) => update({ title: e.target.value })} placeholder="Card title" />
              <CmsTextArea rows={2} value={item.description} onChange={(e) => update({ description: e.target.value })} placeholder="Description" />
            </>
          )}
          renderView={(item) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-xs font-bold text-white">{item.title}</span>
            </div>
          )}
        />
      );
    case 'statistics':
      return (
        <CmsItemList<CmsStatItem>
          items={section.content.items}
          onChange={(items) => onChange({ items })}
          createItem={() => ({ id: createCmsId(), value: '', label: '' })}
          idKey={(s) => s.id}
          addLabel="Add Statistic"
          emptyText="No statistics added yet."
          renderEditor={(item, update) => (
            <div className="flex gap-2">
              <div className="w-32 flex-shrink-0">
                <CmsInput value={item.value} onChange={(e) => update({ value: e.target.value })} placeholder="e.g. 250+" />
              </div>
              <CmsInput value={item.label} onChange={(e) => update({ label: e.target.value })} placeholder="e.g. Participants" />
            </div>
          )}
          renderView={(item) => (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <span className="text-sm font-extrabold font-mono text-violet-300">{item.value}</span>
              <span className="text-[11px] text-white/60">{item.label}</span>
            </div>
          )}
        />
      );
    case 'divider':
      return (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-white/40 text-[11px]">
          <Info className="w-3.5 h-3.5" />
          This section renders a horizontal divider on the page. No content to edit.
        </div>
      );
    case 'html':
      return (
        <CmsField label="Custom HTML" hint="Only visible to Super Admins when adding. Renders raw HTML.">
          <CmsTextArea
            rows={8}
            value={section.content.html}
            onChange={(e) => onChange({ html: e.target.value })}
            placeholder="<div>...</div>"
            className="font-mono text-[11px]"
          />
        </CmsField>
      );
  }
};

const HeroEditor: React.FC<{ content: CmsHero; onChange: (patch: Partial<CmsHero>) => void }> = ({ content: hero, onChange }) => {
  const set = (patch: Partial<CmsHero>) => onChange(patch);
  return (
    <div className="flex flex-col gap-4">
      <CmsImageField
        value={hero.bannerImage}
        onChange={(url) => set({ bannerImage: url, bannerImagePath: '' })}
        label="Event Banner"
        imageAlt={hero.bannerImageAlt}
        onImageAltChange={(alt) => set({ bannerImageAlt: alt })}
        canEdit
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CmsField label="Event Title">
          <CmsInput value={hero.title} onChange={(e) => set({ title: e.target.value })} placeholder="Event name" />
        </CmsField>
        <CmsField label="Event Category">
          <CmsSelect value={hero.category} onChange={(e) => set({ category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-zinc-900">
                {c}
              </option>
            ))}
          </CmsSelect>
        </CmsField>
      </div>
      <CmsField label="Tagline">
        <CmsInput value={hero.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="Short catchy tagline" />
      </CmsField>
      <CmsField label="Short Description">
        <CmsTextArea rows={3} value={hero.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} placeholder="1-2 sentence summary" />
      </CmsField>
      <CmsField label="Status">
        <CmsSelect value={hero.status} onChange={(e) => set({ status: e.target.value as CmsEventStatus })}>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="bg-zinc-900">
              {s}
            </option>
          ))}
        </CmsSelect>
      </CmsField>
    </div>
  );
};

const DetailsEditor: React.FC<{ content: CmsEventDetails; onChange: (patch: Partial<CmsEventDetails>) => void }> = ({ content: details, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {DETAIL_FIELDS.map((f) => (
      <CmsField key={f.key} label={f.label}>
        {f.key === 'mapsLink' ? (
          <CmsInput value={details[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value })} placeholder={f.placeholder} />
        ) : f.key === 'difficultyLevel' ? (
          <CmsSelect value={details[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value })}>
            <option value="" className="bg-zinc-900">Select difficulty</option>
            {DIFFICULTY.map((d) => (
              <option key={d} value={d} className="bg-zinc-900">
                {d}
              </option>
            ))}
          </CmsSelect>
        ) : f.key === 'category' ? (
          <CmsSelect value={details[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value })}>
            <option value="" className="bg-zinc-900">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-zinc-900">
                {c}
              </option>
            ))}
          </CmsSelect>
        ) : f.key === 'registrationStatus' ? (
          <CmsSelect value={details[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value })}>
            <option value="" className="bg-zinc-900">Select status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-zinc-900">
                {s}
              </option>
            ))}
          </CmsSelect>
        ) : (
          <CmsInput value={details[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value })} placeholder={f.placeholder} />
        )}
      </CmsField>
    ))}
  </div>
);

const RequirementsEditor: React.FC<{ items: CmsRule[]; onChange: (items: CmsRule[]) => void }> = ({ items, onChange }) => {
  const addQuick = (text: string) => {
    const exists = items.some((r) => r.text.toLowerCase() === text.toLowerCase());
    if (exists) return;
    onChange([...items, { id: createCmsId(), text }]);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_REQUIREMENTS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => addQuick(r)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-violet-500/40 text-[10px] font-bold cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            {r}
          </button>
        ))}
      </div>
      <CmsItemList<CmsRule>
        items={items}
        onChange={onChange}
        createItem={() => ({ id: createCmsId(), text: '' })}
        idKey={(r) => r.id}
        addLabel="Add Requirement"
        emptyText="No requirements listed yet."
        renderEditor={(item, update) => (
          <CmsInput value={item.text} onChange={(e) => update({ text: e.target.value })} placeholder="e.g. Laptop with charger" />
        )}
        renderView={(item, index) => (
          <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {index + 1}
            </span>
            <span className="text-xs text-white/85 leading-relaxed">{item.text}</span>
          </div>
        )}
      />
    </div>
  );
};

const PersonFields: React.FC<{ person: CmsCoordinatorPerson; update: (patch: Partial<CmsCoordinatorPerson>) => void }> = ({ person, update }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
    <CmsInput value={person.name} onChange={(e) => update({ name: e.target.value })} placeholder="Name" />
    <CmsInput value={person.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="Phone" />
    <CmsInput value={person.email} onChange={(e) => update({ email: e.target.value })} placeholder="Email" />
  </div>
);

const CoordinatorEditor: React.FC<{ content: CmsCoordinatorInfo; onChange: (patch: Partial<CmsCoordinatorInfo>) => void }> = ({ content: info, onChange }) => {
  const setFaculty = (patch: Partial<CmsCoordinatorPerson>) =>
    onChange({ facultyCoordinator: { ...info.facultyCoordinator, ...patch } });
  return (
    <div className="flex flex-col gap-4">
      <CmsField label="Faculty Coordinator">
        <PersonFields person={info.facultyCoordinator} update={setFaculty} />
      </CmsField>
      <CmsItemList<CmsCoordinatorPerson>
        items={info.coordinators}
        onChange={(coordinators) => onChange({ coordinators })}
        createItem={() => ({ id: createCmsId(), name: '', phone: '', email: '' })}
        idKey={(c) => c.id}
        addLabel="Add Event Coordinator"
        emptyText="No event coordinators."
        renderEditor={(item, update) => <PersonFields person={item} update={update} />}
        renderView={(item) => (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <span className="text-xs font-bold text-white">{item.name || '—'}</span>
          </div>
        )}
      />
    </div>
  );
};

const CmsFileField: React.FC<{ value: string; onChange: (url: string) => void; storagePrefix: string }> = ({ value, onChange, storagePrefix }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setProgress(0);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      const path = `${storagePrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}_${safeName}`;
      const url = await uploadFileToStorage(path, file, { contentType: file.type || 'application/octet-stream' }, setProgress);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value && (
        <a href={value} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] text-violet-300 hover:text-violet-200 underline break-all">
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          {value.slice(-60)}
        </a>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/25 text-[10px] font-bold cursor-pointer disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {uploading ? `Uploading… ${progress}%` : value ? 'Replace File' : 'Upload File'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {uploading && (
        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-violet-500 transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <span className="text-[10px] text-rose-300 break-words">{error}</span>}
      <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
    </div>
  );
};

const ContactEditor: React.FC<{ content: CmsContact; onChange: (patch: Partial<CmsContact>) => void }> = ({ content: contact, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {CONTACT_FIELDS.map((f) => (
      <CmsField key={f.key} label={f.label}>
        <CmsInput value={contact[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value })} />
      </CmsField>
    ))}
  </div>
);
