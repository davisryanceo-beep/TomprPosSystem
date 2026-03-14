import React, { useState, useEffect } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Store } from '../../types';
import Button from '../Shared/Button';
import Input from '../Shared/Input';
import Textarea from '../Shared/Textarea';
import Select from '../Shared/Select';
import { FaDesktop, FaSave, FaPalette, FaImage, FaFont, FaCog, FaThLarge, FaQrcode } from 'react-icons/fa';

type CustomerDisplaySettingsType = Pick<
    Store, 'logoUrl' | 'backgroundImageUrl' | 'accentColor' | 'welcomeMessage' |
    'displayTheme' | 'backgroundColor' | 'overlayOpacity' | 'logoSize' | 'fontFamily' |
    'headerColor' | 'bodyTextColor' | 'qrCodeUrl' | 'displayLayout' | 'slideshowImageUrls' |
    'khqrEnabled' | 'khqrMerchantID' | 'khqrMerchantName' | 'khqrCity'
>;

const fontOptions = [
    { value: 'Nunito', label: 'Nunito' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Montserrat', label: 'Montserrat' },
];

const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

const CustomerDisplayEditor: React.FC = () => {
    const { currentUser } = useAuth();
    const { currentStoreId, getStoreById, updateStore } = useShop();

    const [settings, setSettings] = useState<Partial<CustomerDisplaySettingsType>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (currentStoreId) {
            const storeData = getStoreById(currentStoreId);
            if (storeData) {
                setSettings({
                    logoUrl: storeData.logoUrl || '',
                    backgroundImageUrl: storeData.backgroundImageUrl || '',
                    accentColor: storeData.accentColor || '#10b981',
                    welcomeMessage: storeData.welcomeMessage || 'Welcome! Your order will appear here.',
                    displayTheme: storeData.displayTheme || 'light',
                    backgroundColor: storeData.backgroundColor || '#f5f5f5',
                    overlayOpacity: storeData.overlayOpacity ?? 0.7,
                    logoSize: storeData.logoSize ?? 96,
                    fontFamily: storeData.fontFamily || 'Nunito',
                    headerColor: storeData.headerColor || '#1e293b',
                    bodyTextColor: storeData.bodyTextColor || '#334155',
                    qrCodeUrl: storeData.qrCodeUrl || '',
                    displayLayout: storeData.displayLayout || 'standard',
                    slideshowImageUrls: storeData.slideshowImageUrls || [],
                    khqrEnabled: storeData.khqrEnabled || false,
                    khqrMerchantID: storeData.khqrMerchantID || '',
                    khqrMerchantName: storeData.khqrMerchantName || '',
                    khqrCity: storeData.khqrCity || '',
                });
            }
        }
    }, [currentStoreId, getStoreById]);

    const handleSettingChange = (field: keyof CustomerDisplaySettingsType, value: string | number | string[]) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof CustomerDisplaySettingsType) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit for dataURL
                alert("Image size should be less than 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                handleSettingChange(field, reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSlideshowUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newImages: string[] = [];
            let processedCount = 0;

            Array.from(files).forEach((file: File) => {
                if (file.size > 10 * 1024 * 1024) { // 10MB Limit
                    alert(`Skipped ${file.name} because it is larger than 10MB.`);
                    processedCount++;
                    if (processedCount === files.length) {
                        const currentImages = settings.slideshowImageUrls || [];
                        setSettings(prev => ({ ...prev, slideshowImageUrls: [...currentImages, ...newImages] }));
                    }
                    return;
                }

                // Compress/Resize
                const reader = new FileReader();
                reader.onloadend = (readerEvent) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const MAX_DIM = 1280; // Limit resolution for Base64 storage safety

                        if (width > height) {
                            if (width > MAX_DIM) {
                                height *= MAX_DIM / width;
                                width = MAX_DIM;
                            }
                        } else {
                            if (height > MAX_DIM) {
                                width *= MAX_DIM / height;
                                height = MAX_DIM;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0, width, height);
                            // Quality 0.6 to keep size low for Firestore document limits
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                            newImages.push(dataUrl);
                        }

                        processedCount++;
                        if (processedCount === files.length) {
                            const currentImages = settings.slideshowImageUrls || [];
                            setSettings(prev => ({ ...prev, slideshowImageUrls: [...currentImages, ...newImages] }));
                        }
                    };
                    img.src = readerEvent.target?.result as string;
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeSlideshowImage = (index: number) => {
        const currentImages = settings.slideshowImageUrls || [];
        const updatedImages = currentImages.filter((_, i) => i !== index);
        setSettings(prev => ({ ...prev, slideshowImageUrls: updatedImages }));
    };


    const handleSaveSettings = () => {
        if (!currentStoreId) {
            alert("No store selected.");
            return;
        }
        const currentStore = getStoreById(currentStoreId);
        if (currentStore) {
            updateStore({ ...currentStore, ...settings });
            setSuccessMessage("Settings saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    if (!currentStoreId || !currentUser || currentUser.role !== 'Store Admin') {
        return <p className="p-6 text-center">This section is for Store Admins to manage their store's customer display.</p>;
    }

    const storeName = getStoreById(currentStoreId)?.name || "Your Store";
    const {
        logoUrl, backgroundImageUrl, accentColor, welcomeMessage, displayTheme, backgroundColor,
        overlayOpacity, logoSize, fontFamily, headerColor, bodyTextColor, qrCodeUrl,
        displayLayout, slideshowImageUrls
    } = settings;

    return (
        <div className="fade-in grid grid-cols-1 lg:grid-cols-3 h-full">
            {/* Controls Panel */}
            <div className="lg:col-span-1 p-4 overflow-y-auto bg-cream dark:bg-charcoal-dark/50 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center"><FaCog className="mr-2" />Editor Controls</h2>
                    <Button onClick={handleSaveSettings} size="sm" leftIcon={<FaSave />}>Save</Button>
                </div>
                {successMessage && <p className="text-sm text-emerald p-2 bg-emerald/10 rounded-md">{successMessage}</p>}


                <ControlSection icon={<FaThLarge />} title="Layout & Theme">
                    <Select
                        label="Display Mode"
                        options={[
                            { value: 'standard', label: 'Standard (Full Screen)' },
                            { value: 'split-screen', label: 'Split Screen (with Slideshow)' }
                        ]}
                        value={displayLayout || 'standard'}
                        onChange={e => handleSettingChange('displayLayout', e.target.value)}
                    />
                    <Select label="Content Theme" options={themeOptions} value={displayTheme} onChange={e => handleSettingChange('displayTheme', e.target.value)} />
                </ControlSection>

                {displayLayout === 'split-screen' && (
                    <ControlSection icon={<FaImage />} title="Slideshow Images">
                        <div>
                            <label className="block text-sm font-bold text-charcoal dark:text-cream-light mb-2">Upload Images (Max 2MB each)</label>
                            <Input type="file" accept="image/*" multiple onChange={handleSlideshowUpload} className="text-xs w-full mb-3" />
                            {slideshowImageUrls && slideshowImageUrls.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    {slideshowImageUrls.map((url, index) => (
                                        <div key={index} className="relative group">
                                            <img src={url} alt={`Slide ${index + 1}`} className="w-full h-20 object-cover rounded border" />
                                            <button
                                                onClick={() => removeSlideshowImage(index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                            >×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ControlSection>
                )}

                <ControlSection icon={<FaImage />} title="Background">
                    <Input label="Background Image URL" value={backgroundImageUrl || ''} onChange={e => handleSettingChange('backgroundImageUrl', e.target.value)} placeholder="https://..." />
                    <ColorControl label="Background Color" value={backgroundColor || '#f5f5f5'} onChange={v => handleSettingChange('backgroundColor', v)} />
                    <RangeControl label="Overlay Opacity" value={overlayOpacity ?? 0.7} onChange={v => handleSettingChange('overlayOpacity', v)} min={0} max={1} step={0.05} />
                </ControlSection>

                <ControlSection icon={<FaDesktop />} title="Header">
                    <Input label="Logo URL" value={logoUrl || ''} onChange={e => handleSettingChange('logoUrl', e.target.value)} placeholder="https://..." />
                    <RangeControl label="Logo Size (px)" value={logoSize ?? 96} onChange={v => handleSettingChange('logoSize', v)} min={40} max={200} step={4} />
                    <Textarea label="Welcome Message" rows={3} value={welcomeMessage || ''} onChange={e => handleSettingChange('welcomeMessage', e.target.value)} />
                </ControlSection>

                <ControlSection icon={<FaFont />} title="Typography">
                    <Select label="Font Family" options={fontOptions} value={fontFamily} onChange={e => handleSettingChange('fontFamily', e.target.value)} />
                    <ColorControl label="Header Color" value={headerColor || '#1e293b'} onChange={v => handleSettingChange('headerColor', v)} />
                    <ColorControl label="Body Text Color" value={bodyTextColor || '#334155'} onChange={v => handleSettingChange('bodyTextColor', v)} />
                </ControlSection>

                <ControlSection icon={<FaPalette />} title="Accent Color">
                    <ColorControl label="Brand Accent Color" value={accentColor || '#10b981'} onChange={v => handleSettingChange('accentColor', v)} />
                </ControlSection>

                <ControlSection icon={<FaQrcode />} title="Payment Integrations">
                    <FileUploadControl
                        label="Static QR Image (Legacy)"
                        currentValue={qrCodeUrl || ''}
                        onChange={e => handleImageUpload(e, 'qrCodeUrl')}
                    />

                    <div className="mt-4 pt-4 border-t border-emerald/20">
                        <label className="flex items-center space-x-2 font-bold text-charcoal dark:text-cream-light mb-3">
                            <input
                                type="checkbox"
                                checked={settings.khqrEnabled || false}
                                onChange={e => handleSettingChange('khqrEnabled', e.target.checked as any)}
                                className="w-5 h-5 text-emerald-600 rounded bg-gray-100 border-gray-300 focus:ring-emerald-500"
                            />
                            <span>Enable Dynamic KHQR (Bakong)</span>
                        </label>

                        {settings.khqrEnabled && (
                            <div className="space-y-3 pl-2 fade-in">
                                <Input
                                    label="Bakong Account ID"
                                    value={settings.khqrMerchantID || ''}
                                    onChange={e => handleSettingChange('khqrMerchantID', e.target.value)}
                                    placeholder="e.g. your_name@acleda"
                                />
                                <Input
                                    label="Merchant Name"
                                    value={settings.khqrMerchantName || ''}
                                    onChange={e => handleSettingChange('khqrMerchantName', e.target.value)}
                                    placeholder="e.g. Tompr Pos Cafe Management"
                                />
                                <Input
                                    label="City"
                                    value={settings.khqrCity || ''}
                                    onChange={e => handleSettingChange('khqrCity', e.target.value)}
                                    placeholder="e.g. Phnom Penh"
                                />
                            </div>
                        )}
                    </div>
                </ControlSection>

            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-2 p-4 bg-charcoal-900/10 dark:bg-charcoal-900/50 flex items-center justify-center">
                <div className="w-full h-[70vh] max-w-4xl bg-white dark:bg-charcoal-dark shadow-2xl rounded-lg overflow-hidden transform scale-90">
                    {displayLayout === 'split-screen' ? (
                        /* Split Screen Preview */
                        <div className="flex h-full">
                            {/* Left: Slideshow */}
                            <div className="w-1/2 bg-charcoal-dark relative">
                                {slideshowImageUrls && slideshowImageUrls.length > 0 ? (
                                    <div className="absolute inset-0" style={{
                                        backgroundImage: `url(${slideshowImageUrls[0]})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-cream-light/50">
                                        <p className="text-sm">Upload images for slideshow</p>
                                    </div>
                                )}
                            </div>
                            {/* Right: Order Display */}
                            <div className="w-1/2 p-4 flex flex-col" style={{ fontFamily: `'${fontFamily}', sans-serif`, backgroundColor: displayTheme === 'dark' ? '#1e293b' : '#f5f5f5' }}>
                                <header className="text-center mb-2" style={{ color: headerColor }}>
                                    <h1 className="text-xl font-extrabold">{storeName}</h1>
                                </header>
                                <main className={`flex-grow rounded-lg p-3 flex flex-col justify-between text-sm ${displayTheme === 'dark' ? 'bg-charcoal-dark/80 text-cream-light' : 'bg-cream-light/80 text-charcoal-dark'}`}>
                                    <p style={{ color: bodyTextColor, opacity: 0.7 }}>{welcomeMessage}</p>
                                    <div className="text-2xl font-extrabold text-right mt-4 pt-2 border-t" style={{ color: accentColor }}>$12.34</div>
                                </main>
                            </div>
                        </div>
                    ) : (
                        /* Standard Layout Preview */
                        <div className="w-full h-full relative" style={{ fontFamily: `'${fontFamily}', sans-serif`, ... (backgroundImageUrl ? { backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: backgroundColor }) }}>
                            <div className="absolute inset-0" style={{ opacity: backgroundImageUrl ? overlayOpacity : 1, backgroundColor: displayTheme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(245, 245, 245, 0.7)' }}></div>
                            <div className="relative z-10 p-8 flex flex-col h-full">
                                <header className="text-center mb-4" style={{ color: headerColor }}>
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo Preview" className="mx-auto w-auto object-contain" style={{ height: `${logoSize}px` }} />
                                    ) : (
                                        <div className="mx-auto mb-2 flex justify-center" style={{ fontSize: `${logoSize}px`, color: accentColor }}>
                                            <FaDesktop />
                                        </div>
                                    )}
                                    <h1 className="text-3xl font-extrabold mt-2">{storeName}</h1>
                                </header>
                                <main className={`flex-grow rounded-xl p-4 flex flex-col justify-between ${displayTheme === 'dark' ? 'bg-charcoal-dark/80' : 'bg-cream-light/80'}`}>
                                    <div className="flex justify-between items-start">
                                        <p className="text-xl flex-grow" style={{ color: bodyTextColor, opacity: 0.7 }}>{welcomeMessage}</p>
                                        {qrCodeUrl && (
                                            <div className="text-center ml-4 flex-shrink-0">
                                                <img src={qrCodeUrl} alt="QR Code Preview" className="w-32 h-32 object-contain bg-white p-1 rounded-md" />
                                                <p className="text-xs mt-1" style={{ color: bodyTextColor }}>Scan to Pay</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-4xl font-extrabold text-right mt-8 pt-4 border-t-2" style={{ color: accentColor, borderColor: 'rgba(128,128,128,0.5)' }}>$12.34</div>
                                </main>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ControlSection: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="p-3 border border-charcoal/10 dark:border-cream-light/10 rounded-lg">
        <h3 className="text-md font-bold flex items-center mb-3"><span className="text-emerald mr-2">{icon}</span>{title}</h3>
        <div className="space-y-3 pl-6 border-l-2 border-emerald/20">{children}</div>
    </div>
);

const ColorControl: React.FC<{ label: string, value: string, onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <div className="flex items-end gap-2">
        <Input className="flex-grow" label={label} value={value} onChange={e => onChange(e.target.value)} />
        <input type="color" className="p-0 h-12 w-12 bg-transparent rounded-lg cursor-pointer border-none" style={{ 'backgroundColor': 'transparent' }} value={value} onChange={e => onChange(e.target.value)} />
    </div>
);

const RangeControl: React.FC<{ label: string, value: number, onChange: (v: number) => void, min: number, max: number, step: number }> = ({ label, value, onChange, min, max, step }) => (
    <div>
        <label className="block text-sm font-bold text-charcoal dark:text-cream-light mb-1">{label} ({value})</label>
        <input type="range" className="w-full" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} />
    </div>
);

const FileUploadControl: React.FC<{ label: string, currentValue: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, currentValue, onChange }) => (
    <div>
        <label className="block text-sm font-bold text-charcoal dark:text-cream-light mb-2">{label}</label>
        <div className="flex flex-col items-start gap-3">
            {currentValue && <img src={currentValue} alt="preview" className="w-40 h-40 object-contain border rounded-md p-1 bg-white shadow-sm" />}
            <Input type="file" accept="image/*" onChange={onChange} className="text-xs w-full" />
        </div>
    </div>
);

export default CustomerDisplayEditor;