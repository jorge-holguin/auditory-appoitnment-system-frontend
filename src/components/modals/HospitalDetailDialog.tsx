import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Building2, Mail, MapPin, Phone } from "lucide-react"
import type { FhirOrganization } from "@/services/fhirIpsService"

interface HospitalDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  org: FhirOrganization | null
}

export function HospitalDetailDialog({
  open,
  onOpenChange,
  org,
}: HospitalDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F9BB6] to-[#4A6EB0] flex items-center justify-center shadow-sm">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-[#114C5F] text-base leading-tight">
                {org?.name ?? "Organización"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#114C5F]/50 mt-0.5">
                Datos del establecimiento de salud de origen
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-1 bg-slate-200" />

        {org && (
          <div className="space-y-4">
            {(org.identifier?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#114C5F]/45 uppercase tracking-wide mb-1">
                  Código RENIPRESS
                </p>
                <p className="text-sm font-mono text-[#114C5F]">
                  {org.identifier![0].value ?? "—"}
                </p>
              </div>
            )}

            {(org.telecom?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#114C5F]/45 uppercase tracking-wide mb-2">
                  Contacto
                </p>
                <div className="space-y-1.5">
                  {org.telecom!.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-[#114C5F]/80"
                    >
                      {t.system === "phone" ? (
                        <Phone className="w-3.5 h-3.5 text-[#4F9BB6] flex-shrink-0" />
                      ) : (
                        <Mail className="w-3.5 h-3.5 text-[#4F9BB6] flex-shrink-0" />
                      )}
                      <span>{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(org.address?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#114C5F]/45 uppercase tracking-wide mb-2">
                  Dirección
                </p>
                {org.address!.map((addr, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-[#114C5F]/80"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#4F9BB6] flex-shrink-0 mt-0.5" />
                    <div>
                      {addr.line?.map((l, j) => <p key={j}>{l}</p>)}
                      {(addr.city || addr.district) && (
                        <p className="text-[#114C5F]/50 mt-0.5">
                          {[addr.district, addr.city, addr.country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
