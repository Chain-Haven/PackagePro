import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiCall } from '../lib/api';
import { sortRatesByAmount } from '../lib/shipping-rates';
import { loadShipFromConfig, persistShipFromConfig } from '../lib/ship-from-config';

interface ShippingPanelProps {
  orderId: string;
  stationId: string;
  shippingAddress?: Record<string, string>;
  onLabelCreated: (label: LabelInfo) => void;
  onLabelVoided?: () => void;
  preferredAccountId?: string | null;
  allowedAccountIds?: string[];
}

export interface LabelInfo {
  label_id: string;
  tracking_number: string;
  label_download_url: string;
  shipment_cost: number;
  status: string;
}

interface Carrier {
  carrier_id: string;
  name: string;
  friendly_name: string;
}
interface Service {
  service_code: string;
  name: string;
  carrier_id: string;
}
interface Rate {
  rate_id: string;
  carrier_id: string;
  service_code: string;
  service_type: string;
  shipping_amount: { amount: number; currency: string };
  delivery_days: number;
  estimated_delivery_date: string;
}
interface ShipStationAccount {
  id: string;
  label: string;
  connection_status: string;
}

type ShipMode = 'standard' | 'manual' | 'reship';

export function ShippingPanel({
  orderId,
  stationId: _stationId,
  shippingAddress,
  onLabelCreated,
  onLabelVoided,
  preferredAccountId,
  allowedAccountIds,
}: ShippingPanelProps) {
  const [mode, setMode] = useState<ShipMode>('standard');
  const [accounts, setAccounts] = useState<ShipStationAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [selectedCarrierId, setSelectedCarrierId] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceCode, setSelectedServiceCode] = useState('');
  const [rates, setRates] = useState<Rate[]>([]);

  const [weight, setWeight] = useState('16');
  const [weightUnit, setWeightUnit] = useState('ounce');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  const [shipFromName, setShipFromName] = useState('Warehouse');
  const [shipFromAddress, setShipFromAddress] = useState('');
  const [shipFromCity, setShipFromCity] = useState('');
  const [shipFromState, setShipFromState] = useState('');
  const [shipFromZip, setShipFromZip] = useState('');

  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualZip, setManualZip] = useState('');
  const [manualCountry, setManualCountry] = useState('US');

  const [loading, setLoading] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [error, setError] = useState('');
  const [labelInfo, setLabelInfo] = useState<LabelInfo | null>(null);
  const [shipFromLoaded, setShipFromLoaded] = useState(false);
  const sortedRates = useMemo(() => sortRatesByAmount(rates), [rates]);

  useEffect(() => {
    loadAccounts();
  }, [preferredAccountId, allowedAccountIds]);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedShipFrom() {
      try {
        const config = await loadShipFromConfig(window.electronAPI);
        if (cancelled) return;
        if (config.name) setShipFromName(config.name);
        if (config.address) setShipFromAddress(config.address);
        if (config.city) setShipFromCity(config.city);
        if (config.state) setShipFromState(config.state);
        if (config.zip) setShipFromZip(config.zip);
      } finally {
        if (!cancelled) {
          setShipFromLoaded(true);
        }
      }
    }

    void loadSavedShipFrom();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!shipFromLoaded) return;

    void persistShipFromConfig(window.electronAPI, {
      name: shipFromName,
      address: shipFromAddress,
      city: shipFromCity,
      state: shipFromState,
      zip: shipFromZip,
    });
  }, [shipFromAddress, shipFromCity, shipFromLoaded, shipFromName, shipFromState, shipFromZip]);

  async function loadAccounts() {
    try {
      const orgId = (await window.electronAPI.getConfig('org_id')) as string;
      if (!orgId) return;
      const res = await apiCall<{ accounts: ShipStationAccount[] }>(
        `/api/shipstation/accounts?${new URLSearchParams({ org_id: orgId })}`
      );
      const data = res.accounts ?? [];
      const filteredAccounts =
        allowedAccountIds && allowedAccountIds.length > 0
          ? data.filter((account) => allowedAccountIds.includes(account.id))
          : data;
      setAccounts(filteredAccounts);
      if (filteredAccounts.length > 0) {
        const preferred =
          (preferredAccountId &&
            filteredAccounts.find((account) => account.id === preferredAccountId)?.id) ||
          filteredAccounts[0].id;
        setSelectedAccountId(preferred);
        loadCarriers(preferred);
      } else {
        setSelectedAccountId('');
      }
    } catch {
      /* skip */
    }
  }

  const loadCarriers = useCallback(async (accountId: string) => {
    try {
      const res = await apiCall<{ carriers: Carrier[] }>(
        `/api/shipstation/carriers?account_id=${accountId}`
      );
      setCarriers(res.carriers ?? []);
      if (res.carriers?.length) {
        setSelectedCarrierId(res.carriers[0].carrier_id);
        loadServices(accountId, res.carriers[0].carrier_id);
      }
    } catch {
      /* skip */
    }
  }, []);

  async function loadServices(accountId: string, carrierId: string) {
    try {
      const res = await apiCall<{ services: Service[] }>(
        `/api/shipstation/carriers?account_id=${accountId}&carrier_id=${carrierId}`
      );
      setServices(res.services ?? []);
      if (res.services?.length) setSelectedServiceCode(res.services[0].service_code);
    } catch {
      /* skip */
    }
  }

  async function handleGetRates() {
    if (!selectedAccountId) return;
    setRatesLoading(true);
    setError('');
    try {
      const dest =
        mode === 'manual' || mode === 'reship'
          ? {
              name: manualName,
              address_line1: manualAddress,
              city_locality: manualCity,
              state_province: manualState,
              postal_code: manualZip,
              country_code: manualCountry,
            }
          : {
              name: shippingAddress?.first_name
                ? `${shippingAddress.first_name} ${shippingAddress.last_name ?? ''}`.trim()
                : 'Customer',
              address_line1: shippingAddress?.address_1 ?? '',
              city_locality: shippingAddress?.city ?? '',
              state_province: shippingAddress?.state ?? '',
              postal_code: shippingAddress?.postcode ?? '',
              country_code: shippingAddress?.country ?? 'US',
            };

      const shipFrom = {
        name: shipFromName,
        address_line1: shipFromAddress,
        city_locality: shipFromCity,
        state_province: shipFromState,
        postal_code: shipFromZip,
        country_code: 'US',
      };

      const pkgs: unknown[] = [{ weight: { value: parseFloat(weight) || 16, unit: weightUnit } }];
      if (length && width && height) {
        (pkgs[0] as Record<string, unknown>).dimensions = {
          length: parseFloat(length),
          width: parseFloat(width),
          height: parseFloat(height),
          unit: 'inch',
        };
      }

      const res = await apiCall<{ rate_response: { rates: Rate[] } }>('/api/shipstation/rates', {
        method: 'POST',
        body: {
          account_id: selectedAccountId,
          shipment: {
            carrier_id: selectedCarrierId,
            ship_to: dest,
            ship_from: shipFrom,
            packages: pkgs,
          },
        },
      });
      setRates(res.rate_response?.rates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get rates');
    } finally {
      setRatesLoading(false);
    }
  }

  async function handleCreateLabel(rateServiceCode?: string) {
    setLoading(true);
    setError('');
    try {
      const dest =
        mode === 'manual' || mode === 'reship'
          ? {
              name: manualName,
              address_line1: manualAddress,
              city_locality: manualCity,
              state_province: manualState,
              postal_code: manualZip,
              country_code: manualCountry,
            }
          : undefined;

      const shipFrom = shipFromAddress
        ? {
            name: shipFromName,
            address_line1: shipFromAddress,
            city_locality: shipFromCity,
            state_province: shipFromState,
            postal_code: shipFromZip,
            country_code: 'US',
          }
        : undefined;

      const pkgs = [{ weight: { value: parseFloat(weight) || 16, unit: weightUnit } }];

      const label = await apiCall<LabelInfo>('/api/shipstation/labels', {
        method: 'POST',
        body: {
          order_id: orderId,
          account_id: selectedAccountId,
          carrier_id: selectedCarrierId,
          service_code: rateServiceCode || selectedServiceCode,
          ship_to: dest,
          ship_from: shipFrom,
          packages: pkgs,
        },
      });

      setLabelInfo(label);
      onLabelCreated(label);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Label creation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleVoidLabel() {
    if (!labelInfo?.label_id) return;
    setLoading(true);
    setError('');
    try {
      await apiCall(`/api/shipstation/labels/${labelInfo.label_id}/void`, { method: 'POST' });
      setLabelInfo(null);
      onLabelVoided?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void label');
    } finally {
      setLoading(false);
    }
  }

  async function handlePrintLabel() {
    if (!labelInfo?.label_download_url) return;
    await window.electronAPI.printLabel({ url: labelInfo.label_download_url });
  }

  if (labelInfo) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-success/30 bg-success/10 p-4">
          <h3 className="text-sm font-bold text-success">Label Created</h3>
          <p className="mt-1 text-xs font-mono">{labelInfo.tracking_number}</p>
          <p className="text-xs text-muted-foreground">${labelInfo.shipment_cost?.toFixed(2)}</p>
        </div>
        <button
          onClick={handlePrintLabel}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-white"
        >
          PRINT LABEL
        </button>
        <button
          onClick={handlePrintLabel}
          className="w-full rounded-lg border border-border py-2 text-xs text-muted-foreground"
        >
          REPRINT
        </button>
        <button
          onClick={handleVoidLabel}
          disabled={loading}
          className="w-full rounded-lg border border-destructive/30 py-2 text-xs text-destructive hover:bg-destructive/5"
        >
          {loading ? 'Voiding...' : 'VOID LABEL'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
      )}

      <div className="flex gap-1 rounded-lg border border-border p-0.5">
        {(['standard', 'manual', 'reship'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold capitalize ${mode === m ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {m === 'reship' ? 'Reship' : m}
          </button>
        ))}
      </div>

      {accounts.length > 1 && (
        <select
          value={selectedAccountId}
          onChange={(e) => {
            setSelectedAccountId(e.target.value);
            loadCarriers(e.target.value);
          }}
          className="w-full rounded-lg border border-border px-3 py-2 text-xs"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      )}

      {accounts.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          No ShipStation account configured. Add one in the admin dashboard under Settings.
        </p>
      )}

      {(mode === 'manual' || mode === 'reship') && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold">{mode === 'reship' ? 'Reship to' : 'Ship to'}</p>
          <input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Recipient name"
            className="w-full rounded border border-border px-2 py-1.5 text-xs"
          />
          <input
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="Address line 1"
            className="w-full rounded border border-border px-2 py-1.5 text-xs"
          />
          <div className="grid grid-cols-3 gap-1.5">
            <input
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              placeholder="City"
              className="rounded border border-border px-2 py-1.5 text-xs"
            />
            <input
              value={manualState}
              onChange={(e) => setManualState(e.target.value)}
              placeholder="State"
              className="rounded border border-border px-2 py-1.5 text-xs"
            />
            <input
              value={manualZip}
              onChange={(e) => setManualZip(e.target.value)}
              placeholder="ZIP"
              className="rounded border border-border px-2 py-1.5 text-xs"
            />
          </div>
          <select
            value={manualCountry}
            onChange={(e) => setManualCountry(e.target.value)}
            className="w-full rounded border border-border px-2 py-1.5 text-xs"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
          </select>
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-xs font-semibold">Ship from (warehouse)</p>
        <input
          value={shipFromName}
          onChange={(e) => setShipFromName(e.target.value)}
          placeholder="Name"
          className="w-full rounded border border-border px-2 py-1.5 text-xs"
        />
        <input
          value={shipFromAddress}
          onChange={(e) => setShipFromAddress(e.target.value)}
          placeholder="Address"
          className="w-full rounded border border-border px-2 py-1.5 text-xs"
        />
        <div className="grid grid-cols-3 gap-1.5">
          <input
            value={shipFromCity}
            onChange={(e) => setShipFromCity(e.target.value)}
            placeholder="City"
            className="rounded border border-border px-2 py-1.5 text-xs"
          />
          <input
            value={shipFromState}
            onChange={(e) => setShipFromState(e.target.value)}
            placeholder="State"
            className="rounded border border-border px-2 py-1.5 text-xs"
          />
          <input
            value={shipFromZip}
            onChange={(e) => setShipFromZip(e.target.value)}
            placeholder="ZIP"
            className="rounded border border-border px-2 py-1.5 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={selectedCarrierId}
          onChange={(e) => {
            setSelectedCarrierId(e.target.value);
            loadServices(selectedAccountId, e.target.value);
          }}
          className="rounded-lg border border-border px-2 py-2 text-xs"
        >
          <option value="">Carrier</option>
          {carriers.map((c) => (
            <option key={c.carrier_id} value={c.carrier_id}>
              {c.friendly_name || c.name}
            </option>
          ))}
        </select>
        <select
          value={selectedServiceCode}
          onChange={(e) => setSelectedServiceCode(e.target.value)}
          className="rounded-lg border border-border px-2 py-2 text-xs"
        >
          <option value="">Service</option>
          {services.map((s) => (
            <option key={s.service_code} value={s.service_code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        <div className="col-span-2 flex gap-1">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Weight"
            className="flex-1 rounded border border-border px-2 py-1.5 text-xs"
          />
          <select
            value={weightUnit}
            onChange={(e) => setWeightUnit(e.target.value)}
            className="w-16 rounded border border-border px-1 py-1.5 text-xs"
          >
            <option value="ounce">oz</option>
            <option value="pound">lb</option>
            <option value="gram">g</option>
          </select>
        </div>
        <input
          type="number"
          value={length}
          onChange={(e) => setLength(e.target.value)}
          placeholder="L"
          className="rounded border border-border px-2 py-1.5 text-xs"
        />
        <input
          type="number"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          placeholder="W"
          className="rounded border border-border px-2 py-1.5 text-xs"
        />
        <input
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="H"
          className="rounded border border-border px-2 py-1.5 text-xs"
        />
      </div>

      <button
        onClick={handleGetRates}
        disabled={ratesLoading || !selectedAccountId}
        className="w-full rounded-lg border border-primary py-2 text-xs font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
      >
        {ratesLoading ? 'Getting rates...' : 'Compare Rates'}
      </button>

      {rates.length > 0 && (
        <div className="max-h-40 overflow-y-auto space-y-1.5">
          {sortedRates.map((rate) => (
            <button
              key={rate.rate_id}
              onClick={() => handleCreateLabel(rate.service_code)}
              className="w-full rounded-lg border border-border p-2 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{rate.service_type}</span>
                <span className="text-xs font-bold text-primary">
                  ${rate.shipping_amount.amount.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {rate.delivery_days} day{rate.delivery_days !== 1 ? 's' : ''} —{' '}
                {rate.estimated_delivery_date?.split('T')[0] ?? ''}
              </p>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => handleCreateLabel()}
        disabled={loading || !selectedServiceCode || !selectedAccountId}
        className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Creating label...' : 'CREATE & PRINT LABEL'}
      </button>
    </div>
  );
}
