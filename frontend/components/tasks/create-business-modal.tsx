'use client';

import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { BusinessForm } from '@/app/(routes)/new-business/components/business-form';
import { useCreateBusinessForm } from '@/hooks/queries/business-forms/business-forms-queries';
import type { BusinessFormValues } from '@/app/(routes)/new-business/schemas/business-form.schema';
import {
  BUSINESS_FORM_ERROR,
  BUSINESS_FORM_SUCCESS,
} from '@/app/(routes)/new-business/constants/messages';

import ResponsiveModal from '@/components/modals/responsive-modal';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBusinessModal({
  isOpen,
  onClose,
}: CreateBusinessModalProps) {
  const { data: session } = useSession();
  const createMutation = useCreateBusinessForm();

  if (!session?.user?.id) {
    return null;
  }

  const handleSubmit = async (values: BusinessFormValues) => {
    try {
      await createMutation.mutateAsync({
        companyName: values.companyName,
        taxCode: values.taxCode,
        address: values.address,
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        description: values.description || undefined,
        productInfo: values.productInfo || undefined,
        gpkdFileUrl: values.gpkdFileUrl || undefined,
        congBoSpFileUrl: values.congBoSpFileUrl || undefined,
        kiemNghiemFileUrl: values.kiemNghiemFileUrl || undefined,
        nhanSpFileUrl: values.nhanSpFileUrl || undefined,
        maVachFileUrl: values.maVachFileUrl || undefined,
        tccsFileUrl: values.tccsFileUrl || undefined,
        coFileUrl: values.coFileUrl || undefined,
        dangKyNhFileUrl: values.dangKyNhFileUrl || undefined,
        gmpFileUrl: values.gmpFileUrl || undefined,
        otherDocFileUrl: values.otherDocFileUrl || undefined,
        products: values.products?.map((p) => ({
          name: p.name,
          price: p.price,
          imageUrl: p.imageUrl || undefined,
        })),
        attachments: values.attachments
          ?.filter((a) => (a.fileUrl ?? '').trim().length > 0)
          .map((a) => ({
            label: (a.label ?? '').trim(),
            fileUrl: a.fileUrl as string,
            note: a.note ? a.note.trim() || undefined : undefined,
          })),
      });
      toast.success(BUSINESS_FORM_SUCCESS.create);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : BUSINESS_FORM_ERROR.create;
      toast.error(msg);
    }
  };

  return (
    <ResponsiveModal
      className='ws-scope'
      overlayClassName='bg-ws-overlay'
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      maxWidth='sm:max-w-2xl'
    >
      <div className='flex flex-col max-h-[90vh] overflow-hidden bg-ws-surface'>
        {/* Sticky Header */}
        <div className='sticky top-0 z-10 bg-ws-surface p-6 pb-2'>
          <h2 className='text-xl sm:text-2xl font-bold'>Thêm đối tác mới</h2>
          <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
            Điền thông tin để trở thành đối tác ACTA
          </p>
        </div>

        <div className='flex-1 overflow-y-auto p-6 pt-2 ws-scroll'>
          <BusinessForm
            currentUserId={session.user.id}
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending}
            submitLabel='Thêm đối tác'
          />
        </div>
      </div>
    </ResponsiveModal>
  );
}
