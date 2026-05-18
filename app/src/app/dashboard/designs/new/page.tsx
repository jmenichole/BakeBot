'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Save, Info, Palette, Send, Mail, Phone, Copy, X, Image as ImageIcon, Star, CheckCircle2, Plus, MessageSquare, Pencil } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createBrowserClient } from '@/lib/supabase';
import { toast } from '@/hooks/useToast';
import { DesignChatbot } from '@/components/DesignChatbot';
import { calculateQuote, calculateTieredQuotes, QuoteBreakdown, TieredQuotes } from '@/lib/pricing';

interface FileData {
  mimeType: string;
  data: string;
}

export default function NewDesignPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [savedDesignId, setSavedDesignId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [referenceImages, setReferenceImages] = useState<FileData[]>([]);
  const [styleImages, setStyleImages] = useState<FileData[]>([]);
  const [bakerZip, setBakerZip] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState({
    productType: 'cake', // cake, cupcakes, cookies, cakepops
    tiers: 1,
    quantity: 12, // for non-cakes
    flavor: 'Vanilla Bean',
    filling: 'Strawberry',
    addOns: [] as string[],
    theme: '',
    notes: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDesign, setCurrentDesign] = useState<string | null>(null);
  const [useAiPricing, setUseAiPricing] = useState(true);
  const [manualPrice, setManualPrice] = useState<number | string>('');
  const [accuracyRating, setAccuracyRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [refinementText, setRefinementText] = useState('');
  const [showChatbot, setShowChatbot] = useState(false);
  const [editedQuoteItems, setEditedQuoteItems] = useState<Partial<QuoteBreakdown>>({});
  const [isEditingQuote, setIsEditingQuote] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'good' | 'better' | 'best' | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    async function fetchBakerInfo() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: baker } = await supabase
          .from('bakers')
          .select('zip_code, style_reference_images')
          .eq('id', user.id)
          .single();
        if (baker?.zip_code) setBakerZip(baker.zip_code);

        // Pre-load the baker's first saved style image as base64 so it can be used as a
        // reference when generating. The generate API accepts one reference image at a time,
        // so only the first style image is used.
        const styleUrls: string[] = baker?.style_reference_images ?? [];
        if (styleUrls.length > 0) {
          try {
            const res = await fetch(styleUrls[0]);
            const blob = await res.blob();
            const fileData = await new Promise<FileData>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                const matches = result.match(/^data:(.+);base64,(.+)$/);
                if (matches) resolve({ mimeType: matches[1], data: matches[2] });
                else reject(new Error('Failed to parse base64'));
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            setStyleImages([fileData]);
          } catch (err) {
            console.warn('Could not load style reference image:', err);
          }
        }
      }
    }
    fetchBakerInfo();
  }, [supabase]);
  const [quote, setQuote] = useState<QuoteBreakdown>({
    base: 65,
    decor: 0,
    filling: 15,
    addOns: 0,
    overhead: 15,
    complexityTax: 0,
    marketAdjustment: 12,
    serviceFee: 25,
    total: 132
  });
  const [tieredQuotes, setTieredQuotes] = useState<TieredQuotes | null>(null);

  // Dynamic pricing calculation via Engine
  useEffect(() => {
    const pricingConfig = {
      productType: config.productType,
      tiers: config.tiers,
      quantity: config.quantity,
      flavor: config.flavor,
      filling: config.filling,
      addOns: config.addOns,
      themeComplexity: Math.min(config.theme.length / 200, 1),
      zipCode: bakerZip
    };
    const breakdown = calculateQuote(pricingConfig);
    setQuote(breakdown);
    setTieredQuotes(calculateTieredQuotes(pricingConfig));
    setSelectedTier(null);
    setEditedQuoteItems({});
  }, [config, bakerZip]);

  const productTypes = [
    { id: 'cake', label: 'Custom Cake' },
    { id: 'cupcakes', label: 'Cupcakes' },
    { id: 'cookies', label: 'Cookies' },
    { id: 'cakepops', label: 'Cake Pops' }
  ];

  const addOnOptions = ['Fondant Work', 'Gold Leaf', 'Hand-painted', 'Fresh Flowers', 'Acrylic Topper', 'Chocolate Drip'];
  const flavors = ['Vanilla Bean', 'Rich Chocolate', 'Red Velvet', 'Lemon Zest', 'Carrot Cake', 'Confetti'];
  const fillings = ['None', 'Strawberry', 'Chocolate Ganache', 'Cream Cheese', 'Lemon Curd', 'Salted Caramel'];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      if (referenceImages.length + files.length > 5) {
        toast.error("You can only upload up to 5 reference images.");
        return;
      }

      Array.from(files).forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
          toast.error("One or more files are too large. Limit is 5MB per image.");
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const matches = result.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            setReferenceImages(prev => [...prev, {
              mimeType: matches[1],
              data: matches[2]
            }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeReference = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!config.theme) {
      toast.error('Please describe your theme first!');
      return;
    }
    setIsGenerating(true);
    setCurrentDesign(null);

    try {
      const productDesc = config.productType === 'cake' ? `${config.tiers} tier custom cake` : `${config.quantity} gourmet ${config.productType}`;
      const prompt = `Professional high-end bakery photography of a ${productDesc}. Theme: ${config.theme}. ${config.addOns.length > 0 ? `Features: ${config.addOns.join(', ')}.` : ''} The design should be elegant, sharp focus, ${config.flavor} style, sophisticated frosting, detailed decorations. Set on a clean marble countertop with soft warm natural lighting, 8k resolution, photorealistic, masterpiece.`;
      const negative_prompt = "cartoon, drawing, low quality, blurry, text, watermark, messy, plastic, artificial, distorted tiers, floating elements, low-res, ugly, grainy, pixelated";

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, negative_prompt, referenceImages: referenceImages.length > 0 ? referenceImages : styleImages })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setCurrentDesign(data.imageUrl);
      setStep(2);
      setAccuracyRating(null);
      setFeedbackComment('');
      setFeedbackSubmitted(false);

      // Auto-save a draft so the design is never lost if the user navigates away
      try {
        const { data: { user: authedUser } } = await supabase.auth.getUser();
        if (authedUser) {
          const storedUrl = await uploadImageToStorage(data.imageUrl, authedUser.id);
          const { data: draftDesign } = await supabase
            .from('cake_designs')
            .insert({
              baker_id: authedUser.id,
              title: `${config.productType.toUpperCase()}: ${config.theme.slice(0, 20)}...` || 'Custom Design',
              description: config.theme,
              image_url: storedUrl,
              configuration_data: config,
              estimated_price: quote.total,
              is_draft: true,
              is_public: false,
            })
            .select('id')
            .single();
          if (draftDesign) {
            setSavedDesignId(draftDesign.id);
          }
        }
      } catch (autoSaveErr) {
        // Non-blocking — the user can still save manually
        console.warn('Auto-save after generation failed:', autoSaveErr);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('AI Generation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!refinementText) return;
    setIsGenerating(true);

    try {
      // Construct a prompt that includes the refinement
      const prompt = `((${config.productType === 'cake' ? `${config.tiers} tier cake` : `${config.quantity} ${config.productType}`})), professional bakery photograph, theme: ${config.theme}. ${config.addOns.length > 0 ? `Add-ons: ${config.addOns.join(', ')}.` : ''} Modifications: ${refinementText}. High quality, detailed icing, elegant presentation, soft studio lighting.`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, referenceImages: referenceImages.length > 0 ? referenceImages : styleImages })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setCurrentDesign(data.imageUrl);
      setRefinementText('');
      setAccuracyRating(null);
      setFeedbackSubmitted(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Refinement failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!accuracyRating) return;
    setIsSubmittingFeedback(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: accuracyRating,
          comment: feedbackComment,
          prompt: config.theme
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback.');
      }

      setFeedbackSubmitted(true);
    } catch (err) {
      console.error('Feedback error:', err);
      toast.error(`Error: ${err instanceof Error ? err.message : 'Could not submit feedback.'}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Upload a base64 data URL to Supabase Storage; falls back to the data URL on failure
  const uploadImageToStorage = async (dataUrl: string, userId: string): Promise<string> => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1] || 'jpg';
      const filename = `${userId}/${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from('design-images')
        .upload(filename, blob, { contentType: blob.type, upsert: true });

      if (error) {
        console.warn('Storage upload failed, using data URL fallback:', error.message);
        return dataUrl;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('design-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.warn('Storage upload error, using data URL fallback:', err);
      return dataUrl;
    }
  };

  // Compute the effective quote (with any per-line edits applied)
  const effectiveQuote: QuoteBreakdown = {
    base: editedQuoteItems.base ?? quote.base,
    decor: editedQuoteItems.decor ?? quote.decor,
    filling: editedQuoteItems.filling ?? quote.filling,
    addOns: editedQuoteItems.addOns ?? quote.addOns,
    overhead: editedQuoteItems.overhead ?? quote.overhead,
    complexityTax: editedQuoteItems.complexityTax ?? quote.complexityTax,
    marketAdjustment: editedQuoteItems.marketAdjustment ?? quote.marketAdjustment,
    serviceFee: editedQuoteItems.serviceFee ?? quote.serviceFee,
    total: (editedQuoteItems.base ?? quote.base) +
           (editedQuoteItems.decor ?? quote.decor) +
           (editedQuoteItems.filling ?? quote.filling) +
           (editedQuoteItems.addOns ?? quote.addOns) +
           (editedQuoteItems.overhead ?? quote.overhead) +
           (editedQuoteItems.complexityTax ?? quote.complexityTax) +
           (editedQuoteItems.marketAdjustment ?? quote.marketAdjustment) +
           (editedQuoteItems.serviceFee ?? quote.serviceFee),
  };

  const handleSave = async (isFinal = false) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to save designs');
        return;
      }

      const finalPrice = useAiPricing ? effectiveQuote.total : (parseFloat(manualPrice as string) || 0);

      // Upload image to storage so we don't store large data URLs in the DB
      const imageUrl = currentDesign
        ? await uploadImageToStorage(currentDesign, user.id)
        : null;

      let design: { id: string } | null = null;
      let designError: { message: string } | null = null;

      if (savedDesignId) {
        // A draft was already created by the auto-save after generation — update it
        const { data: updated, error: updateError } = await supabase
          .from('cake_designs')
          .update({
            title: `${config.productType.toUpperCase()}: ${config.theme.slice(0, 20)}...` || 'Custom Design',
            description: config.theme,
            image_url: imageUrl,
            configuration_data: config,
            estimated_price: finalPrice,
            is_draft: !isFinal,
            is_public: isFinal,
          })
          .eq('id', savedDesignId)
          .eq('baker_id', user.id)
          .select('id')
          .single();
        design = updated;
        designError = updateError;
      } else {
        // No auto-saved draft yet — insert a new record
        const { data: inserted, error: insertError } = await supabase
          .from('cake_designs')
          .insert({
            baker_id: user.id,
            title: `${config.productType.toUpperCase()}: ${config.theme.slice(0, 20)}...` || 'Custom Design',
            description: config.theme,
            image_url: imageUrl,
            configuration_data: config,
            estimated_price: finalPrice,
            is_draft: !isFinal,
            is_public: isFinal,
          })
          .select('id')
          .single();
        design = inserted;
        designError = insertError;
      }

      if (designError) throw designError;
      if (!design) throw new Error('Design was not saved.');

      if (isFinal) {
        // Open the customer details modal to collect name / email before creating the order
        setSavedDesignId(design.id);
        const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/quote/${design.id}`;
        setShareLink(link);
        setShowCustomerModal(true);
      } else {
        toast.success('Draft saved!');
        router.push('/dashboard/designs');
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Create order with real customer info, then show the share modal
  const handleConfirmSend = async () => {
    if (!savedDesignId || !customerEmail.trim()) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const finalPrice = useAiPricing ? effectiveQuote.total : (parseFloat(manualPrice as string) || 0);

      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          baker_id: user.id,
          design_id: savedDesignId,
          customer_email: customerEmail.trim(),
          customer_name: customerName.trim() || 'Customer',
          customer_phone: customerPhone.trim() || null,
          status: 'pending',
          total_price: finalPrice,
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (orderError) throw orderError;

      await supabase
        .from('cake_designs')
        .update({ is_public: true, is_draft: false })
        .eq('id', savedDesignId)
        .eq('baker_id', user.id);

      // Send quote email to customer via Resend (best-effort: failure doesn't block flow)
      try {
        await fetch('/api/send-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: customerEmail.trim(),
            customerName: customerName.trim() || 'Customer',
            quoteLink: shareLink,
            total: finalPrice,
            designTitle: `${config.productType.toUpperCase()}: ${config.theme.slice(0, 40)}`,
          }),
        });
      } catch (emailErr) {
        console.warn('Quote email send failed (non-blocking):', emailErr);
      }

      setShowCustomerModal(false);
      setShowShareModal(true);
    } catch (err) {
      toast.error('Error creating order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle sending via email
  const handleSendViaEmail = () => {
    const total = useAiPricing ? effectiveQuote.total : (parseFloat(manualPrice as string) || 0);
    const subject = encodeURIComponent(`Your Cake Quote - $${total.toFixed(2)}`);
    const body = encodeURIComponent(
      `Hi! Here's your custom cake quote:\n\n` +
      `Design: ${config.theme}\n` +
      `Price: $${total.toFixed(2)}\n\n` +
      `View your quote here: ${shareLink}\n\n` +
      `Would you like to create a customer account for easy scheduling and payments? ` +
      `It's optional - you can also just message your baker directly!\n\n` +
      `Let me know if you'd like any changes to the design!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Handle sending via SMS
  const handleSendViaSMS = () => {
    const total = useAiPricing ? effectiveQuote.total : (parseFloat(manualPrice as string) || 0);
    const message = encodeURIComponent(
      `Here's your cake quote: $${total.toFixed(2)} - View: ${shareLink}\n\n` +
      `Want to create an account for easy scheduling? Optional! Just message your baker directly.`
    );
    window.location.href = `sms:?body=${message}`;
  };

  // Handle copying link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle saving as image
  const handleSaveAsImage = async () => {
    if (!currentDesign) return;

    setIsSaving(true);
    try {
      // First save as draft
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to save designs');
        return;
      }

      const finalPrice = useAiPricing ? effectiveQuote.total : (parseFloat(manualPrice as string) || 0);

      // Upload image to storage
      const imageUrl = await uploadImageToStorage(currentDesign, user.id);

      const { data: design, error: designError } = await supabase
        .from('cake_designs')
        .insert({
          baker_id: user.id,
          title: `${config.productType.toUpperCase()}: ${config.theme.slice(0, 20)}...` || 'Custom Design',
          description: config.theme,
          image_url: imageUrl,
          configuration_data: config,
          estimated_price: finalPrice,
          is_public: false,
          is_draft: true
        })
        .select()
        .single();

      if (designError) throw designError;
      if (!design) throw new Error('Design was not created.');

      // Download the mockup image
      const response = await fetch(currentDesign);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `cake-quote-${design.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Draft saved! Image downloaded.');
      router.push('/dashboard/designs');
    } catch (err: unknown) {
      console.error(err);
      toast.error('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard/designs" className="p-2 hover:bg-white rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold">New Cake Design</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Configuration Form */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-6 h-6 bg-pink-100 text-primary rounded-full flex items-center justify-center text-xs">1</span>
              Product Type
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {productTypes.map((type) => (
                <button
                  key={type.id}
                  className={`py-3 rounded-xl border-2 transition-all font-bold text-sm ${config.productType === type.id ? 'border-primary bg-pink-50 text-primary shadow-sm' : 'border-gray-50 text-gray-400 hover:border-pink-100'}`}
                  onClick={() => setConfig({ ...config, productType: type.id })}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-6 h-6 bg-pink-100 text-primary rounded-full flex items-center justify-center text-xs">2</span>
              Details
            </h2>

            <div className="space-y-6">
              {config.productType === 'cake' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 ml-1">Number of Tiers</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        className={`py-2 rounded-lg border-2 transition-all ${config.tiers === n ? 'border-primary bg-pink-50 text-primary font-bold' : 'border-gray-50 text-gray-400'}`}
                        onClick={() => setConfig({ ...config, tiers: n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 ml-1">Quantity (Dozens)</label>
                  <input
                    type="number"
                    step="12"
                    min="12"
                    className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    value={config.quantity}
                    onChange={(e) => setConfig({ ...config, quantity: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="base-flavor" className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Flavor</label>
                  <select
                    id="base-flavor"
                    className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20"
                    value={config.flavor}
                    onChange={(e) => setConfig({ ...config, flavor: e.target.value })}
                  >
                    {flavors.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="filling" className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Filling</label>
                  <select
                    id="filling"
                    className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20"
                    value={config.filling}
                    onChange={(e) => setConfig({ ...config, filling: e.target.value })}
                  >
                    {fillings.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 ml-1">Add-ons & Accents</label>
                <div className="flex flex-wrap gap-2">
                  {addOnOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        const newAddOns = config.addOns.includes(opt)
                          ? config.addOns.filter(a => a !== opt)
                          : [...config.addOns, opt];
                        setConfig({ ...config, addOns: newAddOns });
                      }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${config.addOns.includes(opt) ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-pink-200 hover:text-primary'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 ml-1">
                  <label htmlFor="theme" className="block text-xs font-bold uppercase tracking-widest text-gray-400">Theme / Description</label>
                  <button
                    type="button"
                    onClick={() => setShowChatbot(prev => !prev)}
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all ${showChatbot ? 'bg-primary border-primary text-white' : 'border-gray-200 text-gray-400 hover:border-primary hover:text-primary'}`}
                  >
                    <MessageSquare className="w-3 h-3" /> Chat to Design
                  </button>
                </div>

                {/* Prompt tips */}
                <details className="mb-3 bg-pink-50/60 border border-pink-100 rounded-xl overflow-hidden">
                  <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-[10px] font-bold uppercase tracking-widest text-pink-500 select-none list-none">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    Tips for better AI results
                  </summary>
                  <div className="px-3 pb-3 space-y-2">
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      Be specific! The more detail you include, the more accurate the mockup and quote.
                    </p>
                    <div className="space-y-1.5">
                      {[
                        '3-tier vanilla cake, ocean waves, surfboard topper, gold lettering',
                        '2-tier lemon cake, watercolor florals, pastel pink & sage, rustic style',
                        '1-tier birthday cake, cartoon dinosaur, jungle theme, bright greens',
                        'Wedding cake, 4 tiers, white fondant, cascading sugar flowers, gold drips',
                        '12 cupcakes, unicorn theme, rainbow swirl frosting, edible glitter',
                      ].map((ex, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, theme: ex }))}
                          className="w-full text-left text-[10px] bg-white border border-pink-100 rounded-lg px-2.5 py-1.5 text-gray-600 hover:border-primary hover:text-primary transition-all leading-snug"
                        >
                          &ldquo;{ex}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                </details>

                {showChatbot && (
                  <div className="mb-3">
                    <DesignChatbot
                      onPromptReady={(prompt) => {
                        setConfig(prev => ({ ...prev, theme: prompt }));
                        setShowChatbot(false);
                      }}
                      onClose={() => setShowChatbot(false)}
                    />
                  </div>
                )}
                <textarea
                  id="theme"
                  className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 outline-none focus:ring-4 focus:ring-primary/10 min-h-[100px] transition-all"
                  placeholder="e.g. Modern minimalist with white fondant and single gold butterfly..."
                  value={config.theme}
                  onChange={(e) => setConfig({ ...config, theme: e.target.value })}
                />
              </div>
            </div>

            {/* Reference Images */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 ml-1">
                Your Style References (Max 5)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
                {referenceImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                    <Image
                      src={`data:${img.mimeType};base64,${img.data}`}
                      alt={`Ref ${idx}`}
                      className="w-full h-full object-cover"
                      fill
                      unoptimized
                    />
                    <button
                      onClick={() => removeReference(idx)}
                      className="absolute top-1 right-1 bg-white/80 text-gray-700 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {referenceImages.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-primary transition-all"
                  >
                    <Plus size={20} />
                    <span className="text-xs mt-1">Add</span>
                  </button>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
              {referenceImages.length === 0 && styleImages.length > 0 && (
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest ml-1 mt-1 flex items-center gap-1.5">
                  <Palette className="w-3 h-3" /> Your saved style is being applied
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full btn btn-primary py-4 text-lg flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI is Designing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate AI Mockup
              </>
            )}
          </button>
        </div>

        {/* Right: Preview / Mockup */}
        <div className="space-y-6">
          <div className="bg-[#111] p-4 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] aspect-square flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-inset ring-white/5">
            {currentDesign ? (
              <>
                <Image src={currentDesign} alt="Cake Mockup" className="w-full h-full object-cover rounded-2xl shadow-inner" fill unoptimized />
                <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-white border border-white/20 shadow-lg flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" /> AI GENERATED
                </div>

                {/* Accuracy Feedback */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-pink-100 animate-in slide-in-from-bottom-2">
                  {feedbackSubmitted ? (
                    <div className="text-green-600 flex items-center justify-center gap-2 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Thanks for your feedback!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rate Accuracy</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setAccuracyRating(star)}
                              className="hover:scale-110 transition-transform focus:outline-none"
                            >
                              <Star
                                className={`w-5 h-5 ${accuracyRating && star <= accuracyRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {accuracyRating && (
                        <div className="animate-in fade-in slide-in-from-top-1">
                          <textarea
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            placeholder="What could be better? (Optional)"
                            className="w-full p-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:bg-white outline-none focus:border-primary mb-2 resize-none"
                            rows={2}
                          />
                          <button
                            onClick={handleFeedbackSubmit}
                            disabled={isSubmittingFeedback}
                            className="w-full btn btn-primary py-2 text-xs h-8"
                          >
                            {isSubmittingFeedback ? 'Sending...' : 'Submit Feedback'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Refinement Chat Input */}
                <div className="absolute -bottom-16 left-0 right-0 animate-in fade-in slide-in-from-top-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={refinementText}
                      onChange={(e) => setRefinementText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                      placeholder="Refine design (e.g. 'Make it 3 tiers', 'Add blue flowers')"
                      className="flex-1 p-3 rounded-xl border border-gray-200 bg-white shadow-sm text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button onClick={handleRefine} disabled={isGenerating} className="btn btn-secondary p-3 shadow-sm bg-white">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-12 lg:p-20 group relative overflow-hidden flex flex-col items-center z-10 w-full h-full justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#ff69b4_0%,_transparent_60%)] opacity-[0.05] group-hover:opacity-[0.10] transition-opacity duration-1000" />
                
                {/* 3D-ish glowing container */}
                <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-[0_0_30px_rgba(255,105,180,0.15)] flex items-center justify-center mx-auto mb-10 transform -rotate-6 group-hover:rotate-0 transition-all duration-700 backdrop-blur-xl relative before:absolute before:inset-0 before:bg-gradient-to-tr before:from-white/5 before:to-transparent before:rounded-[2.5rem]">
                  <span className="text-5xl group-hover:scale-110 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-transform duration-700 relative z-10">✨</span>
                </div>
                
                <h3 className="text-2xl font-serif font-black text-white mb-3 tracking-tight drop-shadow-md">Your Masterpiece Awaits</h3>
                <p className="text-sm text-gray-400 font-medium max-w-[260px] leading-relaxed mx-auto">
                  Configure your details and hit <strong className="text-primary font-bold filter drop-shadow-[0_0_8px_rgba(255,105,180,0.8)]">Generate</strong> to see the AI magic build your vision.
                </p>
              </div>
            )}
          </div>

          {currentDesign && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 mt-20">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-lg">Final Quote</h3>
                  <p className="text-sm text-gray-500">Suggested by AI + Manual Override</p>
                </div>
                <div className="text-2xl font-black text-secondary">
                  ${useAiPricing ? effectiveQuote.total.toFixed(2) : (parseFloat(manualPrice as string) || 0).toFixed(2)}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <button
                    onClick={() => setUseAiPricing(true)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${useAiPricing ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
                  >
                    AI Suggestion
                  </button>
                  <button
                    onClick={() => setUseAiPricing(false)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${!useAiPricing ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
                  >
                    Manual Price
                  </button>
                </div>

                {useAiPricing ? (
                  <div className="space-y-2 px-1">
                    {/* Tiered quotes selector */}
                    {tieredQuotes && (
                      <div className="mb-4 p-3 bg-pink-50 rounded-xl border border-pink-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Choose a Quote Tier</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(['good', 'better', 'best'] as const).map((tier) => {
                            const tq = tieredQuotes[tier];
                            const isSelected = selectedTier === tier;
                            return (
                              <button
                                key={tier}
                                onClick={() => {
                                  setEditedQuoteItems({});
                                  setSelectedTier(tier);
                                  setQuote(tieredQuotes[tier]);
                                }}
                                className={`p-2 rounded-lg border-2 text-center transition-all ${isSelected ? 'border-primary bg-white shadow-sm' : 'border-transparent bg-white/60 hover:border-pink-200'}`}
                              >
                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">{tq.label}</div>
                                <div className="text-sm font-black text-secondary">${tq.total}</div>
                                <div className="text-[9px] text-gray-400 leading-tight mt-0.5">{tq.description}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end mb-1">
                      <button
                        onClick={() => {
                          if (isEditingQuote) {
                            setEditedQuoteItems({});
                            setSelectedTier(null);
                          }
                          setIsEditingQuote(prev => !prev);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-primary transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        {isEditingQuote ? 'Reset Edits' : 'Edit Line Items'}
                      </button>
                    </div>
                    <EditableQuoteDetail
                      label={`${config.productType === 'cake' ? `${config.tiers} Tier Cake` : `${config.quantity} ${config.productType}`} Base`}
                      value={effectiveQuote.base}
                      isEditing={isEditingQuote}
                      onChange={(v) => setEditedQuoteItems(prev => ({ ...prev, base: v }))}
                    />
                    <EditableQuoteDetail
                      label="Theme & Decoration"
                      value={effectiveQuote.decor}
                      isEditing={isEditingQuote}
                      onChange={(v) => setEditedQuoteItems(prev => ({ ...prev, decor: v }))}
                    />
                    {effectiveQuote.complexityTax > 0 && (
                      <EditableQuoteDetail
                        label="Complexity Surcharge"
                        value={effectiveQuote.complexityTax}
                        isEditing={isEditingQuote}
                        onChange={(v) => setEditedQuoteItems(prev => ({ ...prev, complexityTax: v }))}
                      />
                    )}
                    <EditableQuoteDetail
                      label="Fillings & Flavor"
                      value={effectiveQuote.filling}
                      isEditing={isEditingQuote}
                      onChange={(v) => setEditedQuoteItems(prev => ({ ...prev, filling: v }))}
                    />
                    <EditableQuoteDetail
                      label="Premium Add-ons"
                      value={effectiveQuote.addOns}
                      isEditing={isEditingQuote}
                      onChange={(v) => setEditedQuoteItems(prev => ({ ...prev, addOns: v }))}
                    />
                    <EditableQuoteDetail
                      label="Overhead & Utilities"
                      value={effectiveQuote.overhead}
                      isEditing={isEditingQuote}
                      onChange={(v) => setEditedQuoteItems(prev => ({ ...prev, overhead: v }))}
                    />
                    <EditableQuoteDetail
                      label="Market Adjustment (Area)"
                      value={effectiveQuote.marketAdjustment}
                      isEditing={isEditingQuote}
                      onChange={(v) => setEditedQuoteItems(prev => ({ ...prev, marketAdjustment: v }))}
                    />
                    <EditableQuoteDetail
                      label="Service Fee"
                      value={effectiveQuote.serviceFee}
                      isEditing={isEditingQuote}
                      onChange={(v) => setEditedQuoteItems(prev => ({ ...prev, serviceFee: v }))}
                    />
                    <div className="flex justify-between text-sm font-black border-t border-gray-100 pt-2 mt-2">
                      <span className="text-gray-700">Total</span>
                      <span className="text-primary">${effectiveQuote.total.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 px-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Set Custom Price ($)</label>
                    <input
                      type="number"
                      className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-lg font-black outline-none focus:ring-4 focus:ring-primary/10"
                      placeholder="0.00"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                    />
                    <p className="text-[10px] text-gray-400 italic mt-2">Adjusted based on your local market & supply costs.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  disabled={isSaving}
                  onClick={() => handleSave(false)}
                  className="flex-1 btn btn-secondary py-3 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  disabled={isSaving}
                  onClick={() => handleSave(true)}
                  className="flex-1 btn btn-primary py-3 flex items-center justify-center gap-2 shadow-lg shadow-pink-100"
                >
                  <Send className="w-4 h-4" /> {isSaving ? 'Sending...' : 'Send to Customer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Details Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Customer Details
              </h2>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">Add your customer&apos;s info so you can send them this quote.</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Email Address <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Phone (optional)</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 btn btn-secondary py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={isSaving || !customerEmail.trim()}
                className="flex-1 btn btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSaving ? 'Creating...' : 'Create & Send Quote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Share Quote with Customer
              </h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">Share this link with your customer to view their custom cake quote.</p>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-transparent outline-none text-sm text-gray-700"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSendViaEmail}
                className="flex-1 bg-primary text-white py-3 px-4 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-bold"
              >
                <Mail className="w-4 h-4" />
                Send via Email
              </button>
              <button
                onClick={handleSendViaSMS}
                className="flex-1 bg-secondary text-white py-3 px-4 rounded-xl hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2 font-bold"
              >
                <Phone className="w-4 h-4" />
                Send via SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableQuoteDetail({
  label,
  value,
  isEditing,
  onChange,
}: {
  label: string;
  value: number;
  isEditing: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      {isEditing ? (
        <div className="flex items-center gap-1">
          <span className="text-gray-400 text-xs">$</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={value}
            onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-20 text-right p-1 rounded-lg border border-primary/30 bg-pink-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      ) : (
        <span className="font-semibold">${value.toFixed(2)}</span>
      )}
    </div>
  );
}
