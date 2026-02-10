import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, X, FileText, Image as ImageIcon, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useSubmitTicket } from '@/hooks/useQueries';
import { Platform, Brand } from '@/backend';
import { ExternalBlob } from '@/backend';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TicketFormData {
  platform: Platform;
  brand: Brand;
  subject: string;
  issueDescription: string;
  officeName: string;
  agentName: string;
  employeeId: string;
  email: string;
  freshworksEmail?: string;
  phoneExtension?: string;
  policyNumber?: string;
}

interface FileWithMetadata {
  file: File;
  name: string;
  type: string;
  size: number;
}

type Step = 'brand' | 'platform' | 'subject' | 'form';

export default function SubmitTicket() {
  const [currentStep, setCurrentStep] = useState<Step>('brand');
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<TicketFormData>();
  const submitTicketMutation = useSubmitTicket();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: TicketFormData) => {
    try {
      setSubmitSuccess(false);
      
      // Convert files to ExternalBlob array
      const attachmentBlobs: ExternalBlob[] = [];
      
      for (const fileWithMeta of selectedFiles) {
        const arrayBuffer = await fileWithMeta.file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
          setUploadProgress(prev => ({ ...prev, [fileWithMeta.name]: percentage }));
        });
        attachmentBlobs.push(blob);
      }

      // Store file metadata for retrieval later
      const fileMetadata = selectedFiles.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
      }));

      // Submit ticket with all data
      await submitTicketMutation.mutateAsync({
        platform: data.platform,
        brand: data.brand,
        subject: data.subject,
        issueDescription: data.issueDescription,
        officeName: data.officeName,
        agentName: data.agentName,
        employeeId: data.employeeId,
        email: data.email,
        freshworksEmail: data.freshworksEmail || null,
        extension: data.phoneExtension || null,
        policyNumber: data.policyNumber || null,
        attachments: attachmentBlobs,
        fileMetadata,
      });

      setSubmitSuccess(true);
      toast.success('Ticket submitted successfully!');
      reset();
      setSelectedFiles([]);
      setUploadProgress({});
      
      // Reset to step 1
      setCurrentStep('brand');
      setSelectedBrand(null);
      setSelectedPlatform(null);
      setSelectedSubject(null);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('Failed to submit ticket. Please try again.');
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleBrandNext = () => {
    if (selectedBrand) {
      setValue('brand', selectedBrand);
      setCurrentStep('platform');
    }
  };

  const handlePlatformNext = () => {
    if (selectedPlatform) {
      setValue('platform', selectedPlatform);
      setCurrentStep('subject');
    }
  };

  const handleSubjectNext = () => {
    if (selectedSubject) {
      setValue('subject', selectedSubject);
      setCurrentStep('form');
    }
  };

  const handleBackToSteps = () => {
    setCurrentStep('brand');
  };

  const getStepNumber = (): string => {
    switch (currentStep) {
      case 'brand': return 'Step 1 of 4';
      case 'platform': return 'Step 2 of 4';
      case 'subject': return 'Step 3 of 4';
      case 'form': return 'Step 4 of 4';
      default: return '';
    }
  };

  const getBrandLabel = (brand: Brand): string => {
    switch (brand) {
      case Brand.AMAXTX: return 'A-MAX TX';
      case Brand.ALPA: return 'ALPA';
      case Brand.AMAXCA: return 'A-MAX CA';
      case Brand.VirtualStore: return 'Virtual Store';
      default: return '';
    }
  };

  const getPlatformLabel = (platform: Platform): string => {
    switch (platform) {
      case Platform.OneSpan: return 'OneSpan (Nuvola)';
      case Platform.ObserveAI: return 'Observe.ai';
      case Platform.Freshworks: return 'Freshworks';
      default: return '';
    }
  };

  // Step 1: Brand Selection with colored buttons
  if (currentStep === 'brand') {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="text-sm text-muted-foreground mb-2">{getStepNumber()}</div>
            <CardTitle>Select Brand</CardTitle>
            <CardDescription>
              Choose the brand associated with your ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Brand *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedBrand(Brand.AMAXTX)}
                  className={cn(
                    "h-auto py-6 text-base font-semibold transition-all",
                    selectedBrand === Brand.AMAXTX
                      ? "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white"
                      : "hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950"
                  )}
                >
                  A-MAX TX
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedBrand(Brand.ALPA)}
                  className={cn(
                    "h-auto py-6 text-base font-semibold transition-all",
                    selectedBrand === Brand.ALPA
                      ? "bg-purple-600 text-white border-purple-600 hover:bg-purple-700 hover:text-white"
                      : "hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950"
                  )}
                >
                  ALPA
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedBrand(Brand.AMAXCA)}
                  className={cn(
                    "h-auto py-6 text-base font-semibold transition-all",
                    selectedBrand === Brand.AMAXCA
                      ? "bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600 hover:text-white"
                      : "hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-yellow-950"
                  )}
                >
                  A-MAX CA
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedBrand(Brand.VirtualStore)}
                  className={cn(
                    "h-auto py-6 text-base font-semibold transition-all",
                    selectedBrand === Brand.VirtualStore
                      ? "bg-green-600 text-white border-green-600 hover:bg-green-700 hover:text-white"
                      : "hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950"
                  )}
                >
                  Virtual Store
                </Button>
              </div>
            </div>

            <Button
              onClick={handleBrandNext}
              disabled={!selectedBrand}
              className="w-full"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Platform Selection with colored buttons
  if (currentStep === 'platform') {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="text-sm text-muted-foreground mb-2">{getStepNumber()}</div>
            <CardTitle>Select Platform</CardTitle>
            <CardDescription>
              Choose the platform where you're experiencing an issue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Platform *</Label>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedPlatform(Platform.OneSpan)}
                  className={cn(
                    "h-auto py-6 text-base font-semibold transition-all",
                    selectedPlatform === Platform.OneSpan
                      ? "bg-[oklch(0.65_0.15_180)] text-white border-[oklch(0.65_0.15_180)] hover:bg-[oklch(0.60_0.15_180)] hover:text-white"
                      : "hover:bg-[oklch(0.95_0.05_180)] hover:border-[oklch(0.65_0.15_180)] dark:hover:bg-[oklch(0.25_0.05_180)]"
                  )}
                >
                  OneSpan (Nuvola)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedPlatform(Platform.ObserveAI)}
                  className={cn(
                    "h-auto py-6 text-base font-semibold transition-all",
                    selectedPlatform === Platform.ObserveAI
                      ? "bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600 hover:text-white"
                      : "hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-yellow-950"
                  )}
                >
                  Observe.ai
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedPlatform(Platform.Freshworks)}
                  className={cn(
                    "h-auto py-6 text-base font-semibold transition-all",
                    selectedPlatform === Platform.Freshworks
                      ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600 hover:text-white"
                      : "hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950"
                  )}
                >
                  Freshworks
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentStep('brand')}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handlePlatformNext}
                disabled={!selectedPlatform}
                className="flex-1"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Subject Selection with buttons
  if (currentStep === 'subject') {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="text-sm text-muted-foreground mb-2">{getStepNumber()}</div>
            <CardTitle>Select Subject</CardTitle>
            <CardDescription>
              Choose the category that best describes your issue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Subject *</Label>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedSubject('Login or Password Reset')}
                  className={cn(
                    "h-auto py-6 text-base font-semibold transition-all",
                    selectedSubject === 'Login or Password Reset'
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : "hover:bg-accent"
                  )}
                >
                  Login or Password Reset
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedSubject('Receiving Error')}
                  className={cn(
                    "h-auto py-6 text-base font-semibold transition-all",
                    selectedSubject === 'Receiving Error'
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : "hover:bg-accent"
                  )}
                >
                  Receiving Error
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedSubject('Other Issue')}
                  className={cn(
                    "h-auto py-6 text-base font-semibold transition-all",
                    selectedSubject === 'Other Issue'
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : "hover:bg-accent"
                  )}
                >
                  Other Issue
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentStep('platform')}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSubjectNext}
                disabled={!selectedSubject}
                className="flex-1"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Full Form
  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <div className="text-sm text-muted-foreground mb-2">{getStepNumber()}</div>
          <CardTitle>Complete Your Ticket</CardTitle>
          <CardDescription>
            Fill in the remaining details to submit your ticket
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitSuccess && (
            <Alert className="mb-6 border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Ticket submitted successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Display pre-selected values */}
          <div className="mb-6 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Your Selections</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBackToSteps}
              >
                Change
              </Button>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brand:</span>
                <span className="font-medium">{selectedBrand && getBrandLabel(selectedBrand)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform:</span>
                <span className="font-medium">{selectedPlatform && getPlatformLabel(selectedPlatform)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-medium">{selectedSubject}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="officeName">Office Name *</Label>
              <Input
                id="officeName"
                {...register('officeName', { required: true })}
                placeholder="Enter office name"
              />
              {errors.officeName && (
                <p className="text-sm text-destructive">Office name is required</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name *</Label>
              <Input
                id="agentName"
                {...register('agentName', { required: true })}
                placeholder="Enter agent name"
              />
              {errors.agentName && (
                <p className="text-sm text-destructive">Agent name is required</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID *</Label>
              <Input
                id="employeeId"
                type="text"
                {...register('employeeId', { 
                  required: 'Employee ID is required',
                  pattern: {
                    value: /^[0-9]+$/,
                    message: 'Employee ID must contain only numbers'
                  }
                })}
                placeholder="Enter employee ID (numbers only)"
              />
              {errors.employeeId && (
                <p className="text-sm text-destructive">{errors.employeeId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address'
                  }
                })}
                placeholder="Enter the best work email for us to contact you at."
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {selectedPlatform === Platform.Freshworks && (
              <div className="space-y-2">
                <Label htmlFor="freshworksEmail">Freshworks Email *</Label>
                <Input
                  id="freshworksEmail"
                  type="email"
                  {...register('freshworksEmail', { 
                    required: selectedPlatform === Platform.Freshworks ? 'Freshworks Email is required' : false,
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address'
                    }
                  })}
                  placeholder="Enter the email you use to log in to Freshworks."
                />
                {errors.freshworksEmail && (
                  <p className="text-sm text-destructive">{errors.freshworksEmail.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phoneExtension">Phone Extension</Label>
              <Input
                id="phoneExtension"
                type="text"
                {...register('phoneExtension', {
                  pattern: {
                    value: /^[0-9]*$/,
                    message: 'Phone Extension must contain only numbers'
                  }
                })}
                placeholder="Enter your phone extension (numbers only, optional)."
              />
              {errors.phoneExtension && (
                <p className="text-sm text-destructive">{errors.phoneExtension.message}</p>
              )}
            </div>

            {selectedPlatform === Platform.OneSpan && (
              <div className="space-y-2">
                <Label htmlFor="policyNumber">Policy Number</Label>
                <Input
                  id="policyNumber"
                  {...register('policyNumber')}
                  placeholder="Enter policy number"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="issueDescription">Issue Description *</Label>
              <Textarea
                id="issueDescription"
                {...register('issueDescription', { required: true })}
                placeholder="Describe the issue in detail..."
                rows={6}
              />
              {errors.issueDescription && (
                <p className="text-sm text-destructive">Issue description is required</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please upload screenshots and relevant documents for your ticket. Multiple files are supported.
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Files
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2 rounded-lg border p-4">
                  {selectedFiles.map((fileWithMeta, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md bg-muted p-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(fileWithMeta.name)}
                        <span className="text-sm truncate">{fileWithMeta.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          ({formatFileSize(fileWithMeta.size)})
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleBackToSteps}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Steps
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitTicketMutation.isPending}
              >
                {submitTicketMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Ticket'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
