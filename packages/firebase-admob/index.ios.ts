import { Utils } from '@nativescript/core';
import { IAdmob, AdEventListener, RequestConfiguration, AdShowOptions, IInterstitialAd, RequestOptions, IRewardedAd, ServerSideVerificationOptions, IRewardedInterstitialAd, IRewardedItem, AdapterStatus } from '.';
import { MaxAdContentRating, AdEventType, BannerAdBase, RewardedAdEventType, unitIdProperty, BannerAdSizeBase, sizeProperty } from './common';
import { topViewController, toSerializeRequestOptions } from './utils';

export { MaxAdContentRating, AdEventType };

export * from './adsconsent';
export * from './nativead';

export class AdmobError extends Error {
	_native: NSError;
	static fromNative(native: NSError, message?: string) {
		const error = new AdmobError(message || native?.localizedDescription);
		error._native = native;
		return error;
	}

	get native() {
		return this._native;
	}

	intoNative() {
		if (!this._native) {
			const exception = NSException.exceptionWithNameReasonUserInfo(NSGenericException, this.message, null);
			const info = {};
			info['ExceptionName'] = exception.name;
			info['ExceptionReason'] = exception.reason;
			info['ExceptionCallStackReturnAddresses'] = exception.callStackReturnAddresses;
			info['ExceptionCallStackSymbols'] = exception.callStackSymbols;
			info['ExceptionUserInfo'] = exception.userInfo;
			const error = NSError.alloc().initWithDomainCodeUserInfo('NativeScript', 1000, info as any);
			return error;
		}
		return this._native;
	}
}

let defaultAdmob: Admob;

if (!global.__admob) {
	Object.defineProperty(global, '__admob', {
		value: () => {
			if (!defaultAdmob) {
				defaultAdmob = new Admob();
			}
			return defaultAdmob;
		},
		writable: false,
	});
}

export class AdRequest {
	_native: GADRequest;

	static fromNative(request: GADRequest) {
		if (request instanceof GADRequest) {
			const ret = new AdRequest();
			ret._native = request;
			return ret;
		}
		return null;
	}

	get contentUrl(): string {
		return this._native.contentURL;
	}

	get keywords(): string[] {
		const kw = this._native.keywords;
		const count = kw.count;
		const ret = [];
		for (let i = 0; i < count; i++) {
			ret.push(kw.objectAtIndex(i));
		}
		return ret;
	}

	get neighboringContentUrls(): string[] {
		const urls = this._native.keywords;
		const count = urls.count;
		const ret = [];
		for (let i = 0; i < count; i++) {
			ret.push(urls.objectAtIndex(i));
		}
		return ret;
	}

	isTestDevice(): boolean {
		// todo
		return false;
	}

	get native() {
		return this._native;
	}

	get ios() {
		return this.native;
	}
}

export class InterstitialAd implements IInterstitialAd {
	_native: GADInterstitialAd;
	_adUnitId: string;
	_requestOptions?: RequestOptions;
	_delegate: GADFullScreenContentDelegateImpl;
	_loaded = false;
	_nativeRequest: GADRequest;

	static createForAdRequest(adUnitId: string, requestOptions?: RequestOptions): InterstitialAd {
		const ad = new InterstitialAd();
		ad._adUnitId = adUnitId;
		ad._requestOptions = requestOptions;
		ad._delegate = GADFullScreenContentDelegateImpl.initWithOwner(new WeakRef(ad));
		return ad;
	}

	get adUnitId(): string {
		return this._adUnitId;
	}

	get loaded(): boolean {
		return this._loaded;
	}

	load(): void {
		const ref = new WeakRef<InterstitialAd>(this);
		const request = toSerializeRequestOptions(this._requestOptions);
		GADInterstitialAd.loadWithAdUnitIDRequestCompletionHandler(this._adUnitId, request, (ad, error) => {
			if (error) {
				ref.get()?._onAdEvent?.(AdEventType.FAILED_TO_LOAD_EVENT, AdmobError.fromNative(error));
			} else {
				ad.fullScreenContentDelegate = ref.get()?._delegate;
				ref.get()?._setNative(ad);
				ref.get()?._setLoaded(true);
				ref.get()?._onAdEvent?.(AdEventType.LOADED);
			}
		});
		this._nativeRequest = request;
	}

	_setNative(value) {
		this._native = value;
	}

	_setLoaded(value) {
		this._loaded = value;
	}

	_onAdEvent: AdEventListener;

	onAdEvent(listener: AdEventListener) {
		this._onAdEvent = listener;
	}

	show(showOptions?: AdShowOptions) {
		this._native.presentFromRootViewController(topViewController());
	}

	get request() {
		return AdRequest.fromNative(this._nativeRequest);
	}
}

export class RewardedInterstitialAd implements IRewardedInterstitialAd {
	_native: GADRewardedInterstitialAd;
	_adUnitId: string;
	_requestOptions?: RequestOptions;
	_loaded = false;
	_delegate: GADFullScreenContentDelegateImpl;
	_nativeRequest: GADRequest;

	static createForAdRequest(adUnitId: string, requestOptions?: RequestOptions): RewardedInterstitialAd {
		const ad = new RewardedInterstitialAd();
		ad._adUnitId = adUnitId;
		ad._requestOptions = requestOptions;
		ad._delegate = GADFullScreenContentDelegateImpl.initWithOwner(new WeakRef(ad));
		return ad;
	}

	get adUnitId(): string {
		return this._adUnitId;
	}

	get loaded(): boolean {
		return this._loaded;
	}

	load(): void {
		const ref = new WeakRef(this);
		const request = toSerializeRequestOptions(this._requestOptions);
		GADRewardedInterstitialAd.loadWithAdUnitIDRequestCompletionHandler(this._adUnitId, request, (ad, error) => {
			if (error) {
				ref.get()?._onAdEvent?.(AdEventType.FAILED_TO_LOAD_EVENT, AdmobError.fromNative(error));
			} else {
				ad.fullScreenContentDelegate = ref.get()?._delegate;
				ref.get()?._setNative(ad);
				ref.get()?._setLoaded(true);
				ref.get()?._onAdEvent?.(AdEventType.LOADED);
			}
		});
		this._nativeRequest = request;
	}

	_setNative(value) {
		this._native = value;
	}

	_setLoaded(value) {
		this._loaded = value;
	}

	_onAdEvent: AdEventListener;

	onAdEvent(listener: AdEventListener) {
		this._onAdEvent = listener;
	}

	show(showOptions?: AdShowOptions) {
		this.native.presentFromRootViewControllerUserDidEarnRewardHandler(topViewController(), () => {
			this._onAdEvent?.(RewardedAdEventType.EARNED_REWARD, null, RewardedItem.fromNative(this.native.adReward));
		});
	}

	setServerSideVerificationOptions(options: ServerSideVerificationOptions): void {
		if (this.native) {
			const ssvo = GADServerSideVerificationOptions.new();
			if (options.customData) {
				ssvo.customRewardString = options.customData;
			}
			if (options.userId) {
				ssvo.userIdentifier = options.userId;
			}
			this.native.serverSideVerificationOptions = ssvo;
		}
	}

	get native() {
		return this._native;
	}

	get ios() {
		return this.native;
	}

	get request() {
		return AdRequest.fromNative(this._nativeRequest);
	}
}

export class RewardedAd implements IRewardedAd {
	_native: GADRewardedAd;
	_adUnitId: string;
	_requestOptions?: RequestOptions;
	_delegate: GADFullScreenContentDelegateImpl;
	_loaded = false;
	_nativeRequest: GADRequest;
	get loaded() {
		return this._loaded;
	}

	static createForAdRequest(adUnitId: string, requestOptions?: RequestOptions): RewardedAd {
		const reward = new RewardedAd();
		reward._adUnitId = adUnitId;
		reward._requestOptions = requestOptions;
		reward._delegate = GADFullScreenContentDelegateImpl.initWithOwner(new WeakRef(reward));
		return reward;
	}

	get adUnitId(): string {
		return this._adUnitId;
	}

	load(): void {
		const request = toSerializeRequestOptions(this._requestOptions);
		const ref = new WeakRef(this);
		GADRewardedAd.loadWithAdUnitIDRequestCompletionHandler(this._adUnitId, request, (ad, error) => {
			if (error) {
				ref.get()?._onAdEvent?.(AdEventType.FAILED_TO_LOAD_EVENT, AdmobError.fromNative(error));
			} else {
				ad.fullScreenContentDelegate = ref.get()?._delegate;
				ref.get()?._setNative(ad);
				ref.get()?._setLoaded(true);
				ref.get()?._onAdEvent?.(AdEventType.LOADED);
			}
		});
		this._nativeRequest = request;
	}

	_setNative(value) {
		this._native = value;
	}

	_setLoaded(value) {
		this._loaded = value;
	}

	_onAdEvent: AdEventListener;

	onAdEvent(listener: AdEventListener) {
		this._onAdEvent = listener;
	}

	show(showOptions?: AdShowOptions) {
		this.native.presentFromRootViewControllerUserDidEarnRewardHandler(topViewController(), () => {
			this._onAdEvent?.(RewardedAdEventType.EARNED_REWARD, null, RewardedItem.fromNative(this.native.adReward));
		});
	}

	setServerSideVerificationOptions(options: ServerSideVerificationOptions): void {
		if (this.native) {
			const ssvo = GADServerSideVerificationOptions.new();
			if (options.customData) {
				ssvo.customRewardString = options.customData;
			}
			if (options.userId) {
				ssvo.userIdentifier = options.userId;
			}
			this.native.serverSideVerificationOptions = ssvo;
		}
	}

	get native() {
		return this._native;
	}

	get ios() {
		return this.native;
	}

	get request() {
		return AdRequest.fromNative(this._nativeRequest);
	}
}

export class RewardedItem implements IRewardedItem {
	_native: GADAdReward;

	static fromNative(reward: GADAdReward) {
		if (reward instanceof GADAdReward) {
			const item = new RewardedItem();
			item._native = reward;
			return item;
		}
		return null;
	}

	get amount(): number {
		return this.native?.amount?.floatValue;
	}

	get type(): string {
		return this.native?.type;
	}

	get native() {
		return this._native;
	}

	get android() {
		return this.native;
	}
}

export class BannerAdSize extends BannerAdSizeBase {
	_native: GADAdSize;

	constructor(width: number, height: number, native?) {
		super();
		if (typeof width === 'number' && typeof height === 'number') {
			this._native = GADAdSizeFromCGSize(CGSizeMake(width, height));
		} else if (arguments[2] instanceof GADAdSize) {
			this._native = arguments[2];
		} else {
			this._native = GADAdSizeInvalid;
		}
	}

	static fromNative(size: GADAdSize) {
		return new BannerAdSize(null, null, size);
	}

	static get BANNER(): BannerAdSize {
		return BannerAdSize.fromNative(TNSGA.createBanner(NSCGABannersSize.Banner));
	}

	static get FULL_BANNER(): BannerAdSize {
		return BannerAdSize.fromNative(TNSGA.createBanner(NSCGABannersSize.FullBanner));
	}

	static get LARGE_BANNER(): BannerAdSize {
		return BannerAdSize.fromNative(TNSGA.createBanner(NSCGABannersSize.LargeBanner));
	}

	static get LEADERBOARD(): BannerAdSize {
		return BannerAdSize.fromNative(TNSGA.createBanner(NSCGABannersSize.LeaderBoard));
	}

	static get MEDIUM_RECTANGLE(): BannerAdSize {
		return BannerAdSize.fromNative(TNSGA.createBanner(NSCGABannersSize.MediumRectangle));
	}

	static createAnchoredAdaptiveBanner(width: number, orientation: 'portrait' | 'landscape' | 'device' = 'device'): BannerAdSize {
		let nativeOrientation: Orientation = Orientation.Device;
		if (orientation === 'portrait') {
			nativeOrientation = Orientation.Portrait;
		} else if (orientation === 'landscape') {
			nativeOrientation = Orientation.Landscape;
		}

		return BannerAdSize.fromNative(TNSGA.createAnchoredAdaptiveBanner(width, nativeOrientation));
	}

	static createInLineAdaptiveBanner(width: number, maxHeight: number = 0, orientation: 'portrait' | 'landscape' | 'device' = 'device'): BannerAdSize {
		let nativeOrientation: Orientation = Orientation.Device;
		if (orientation === 'portrait') {
			nativeOrientation = Orientation.Portrait;
		} else if (orientation === 'landscape') {
			nativeOrientation = Orientation.Landscape;
		}

		return BannerAdSize.fromNative(TNSGA.createInlineAdaptiveBanner(width, maxHeight, nativeOrientation));
	}

	static get FLUID(): BannerAdSize {
		return BannerAdSize.fromNative(TNSGA.createBanner(NSCGABannersSize.Fluid));
	}

	static get WIDE_SKYSCRAPER(): BannerAdSize {
		return BannerAdSize.fromNative(TNSGA.createBanner(NSCGABannersSize.WideSkyScraper));
	}

	static get INVALID(): BannerAdSize {
		return BannerAdSize.fromNative(TNSGA.createBanner(NSCGABannersSize.Invalid));
	}

	static get SEARCH(): BannerAdSize {
		console.error('BannerAdSize', 'SEARCH', 'not supported on iOS');
		return BannerAdSize.INVALID;
	}

	get native() {
		return this._native;
	}

	get ios() {
		return this.native;
	}
}

export class BannerAd extends BannerAdBase {
	_isLoading = false;

	_setIsLoading(value) {
		this._isLoading = value;
	}

	isLoading(): boolean {
		return this._isLoading;
	}

	_native: GADBannerView;
	_delegate: GADBannerViewDelegateImpl;

	_nativeRequest: GADRequest;

	createNativeView() {
		this._native = GADBannerView.new();
		this._delegate = GADBannerViewDelegateImpl.initWithOwner(new WeakRef(this));
		return this._native;
	}

	initNativeView() {
		this._native.delegate = this._delegate;
	}

	onLoaded() {
		super.onLoaded();
		this._native.rootViewController = topViewController();
	}

	load(options: RequestOptions = {}) {
		this._isLoading = true;
		const request = toSerializeRequestOptions(options);
		this._native?.loadRequest?.(request);
		this._nativeRequest = request;
	}

	[sizeProperty.setNative](value) {
		if (this._native) {
			this._native.adSize = value?.native;
		}
	}

	[unitIdProperty.setNative](value) {
		if (this._native) {
			this._native.adUnitID = value;
		}
	}

	public onMeasure(widthMeasureSpec: number, heightMeasureSpec: number) {
		const nativeView = this.nativeView;
		if (nativeView) {
			const width = Utils.layout.getMeasureSpecSize(widthMeasureSpec);
			const height = Utils.layout.getMeasureSpecSize(heightMeasureSpec);
			this.setMeasuredDimension(width, height);
		}
	}

	get request() {
		return AdRequest.fromNative(this._nativeRequest);
	}
}

export class Admob implements IAdmob {
	constructor() {
		if (defaultAdmob) {
			return defaultAdmob;
		}
		defaultAdmob = this;
	}

	static init(): Promise<{ [key: string]: AdapterStatus }> {
		return new Promise((resolve, reject) => {
			GADMobileAds.sharedInstance().startWithCompletionHandler((status) => {
				const data = {};
				const keys = status.adapterStatusesByClassName.allKeys;
				const count = keys.count;
				for (let i = 0; i < count; i++) {
					const key = keys.objectAtIndex(i);
					const obj = status.adapterStatusesByClassName.objectForKey(key);

					data[key] = {
						description: obj.description,
						latency: obj.latency,
						state: obj.state,
					};
				}
				resolve(data);
			});
		});
	}

	static getInstance(): Admob {
		return new Admob();
	}

	_requestConfiguration: RequestConfiguration = {};

	set requestConfiguration(requestConfiguration: RequestConfiguration) {
		switch (requestConfiguration?.maxAdContentRating) {
			case MaxAdContentRating.G:
				GADMobileAds.sharedInstance().requestConfiguration.maxAdContentRating = GADMaxAdContentRatingGeneral;
				break;
			case MaxAdContentRating.MA:
				GADMobileAds.sharedInstance().requestConfiguration.maxAdContentRating = GADMaxAdContentRatingMatureAudience;
				break;
			case MaxAdContentRating.PG:
				GADMobileAds.sharedInstance().requestConfiguration.maxAdContentRating = GADMaxAdContentRatingParentalGuidance;
				break;
			case MaxAdContentRating.T:
				GADMobileAds.sharedInstance().requestConfiguration.maxAdContentRating = GADMaxAdContentRatingTeen;
				break;
		}

		if (typeof requestConfiguration?.tagForChildDirectedTreatment === 'boolean') {
			this._requestConfiguration.tagForChildDirectedTreatment = requestConfiguration.tagForChildDirectedTreatment;
			GADMobileAds.sharedInstance().requestConfiguration.tagForChildDirectedTreatment = Number(requestConfiguration.tagForChildDirectedTreatment);
		}

		if (typeof requestConfiguration?.tagForUnderAgeOfConsent === 'boolean') {
			this._requestConfiguration.tagForUnderAgeOfConsent = requestConfiguration.tagForUnderAgeOfConsent;
			GADMobileAds.sharedInstance().requestConfiguration.tagForUnderAgeOfConsent = Number(requestConfiguration.tagForUnderAgeOfConsent);
		}

		if (Array.isArray(requestConfiguration?.testDevices)) {
			GADMobileAds.sharedInstance().requestConfiguration.testDeviceIdentifiers = requestConfiguration.testDevices.map((item) => {
				if (item === 'EMULATOR') {
					if (typeof GADSimulatorID) {
						return GADSimulatorID;
					}
					return '';
				}
				return item;
			}) as any;
		}
	}

	get requestConfiguration(): RequestConfiguration {
		const ret: RequestConfiguration = Object.assign({}, ...(this._requestConfiguration as any));

		const config = GADMobileAds.sharedInstance().requestConfiguration;

		switch (config.maxAdContentRating) {
			case GADMaxAdContentRatingGeneral:
				ret.maxAdContentRating = MaxAdContentRating.G;
				break;
			case GADMaxAdContentRatingMatureAudience:
				ret.maxAdContentRating = MaxAdContentRating.MA;
				break;
			case GADMaxAdContentRatingParentalGuidance:
				ret.maxAdContentRating = MaxAdContentRating.PG;
				break;
			case GADMaxAdContentRatingTeen:
				ret.maxAdContentRating = MaxAdContentRating.T;
				break;
			default:
				// noop
				break;
		}

		ret.testDevices = [];

		const devices = config.testDeviceIdentifiers;
		if (devices) {
			const count = devices.count;
			for (let i = 0; i < count; i++) {
				ret.testDevices.push(devices.objectAtIndex(i));
			}
		}
		return ret;
	}

	setRequestConfiguration(requestConfiguration: RequestConfiguration) {
		this.requestConfiguration = requestConfiguration;
	}

	getRequestConfiguration(): RequestConfiguration {
		return this.requestConfiguration;
	}

	get app() {
		return global?.__defaultFirebaseApp;
	}
}

@NativeClass
@ObjCClass(GADFullScreenContentDelegate)
class GADFullScreenContentDelegateImpl extends NSObject implements GADFullScreenContentDelegate {
	_owner: WeakRef<RewardedAd> | WeakRef<InterstitialAd> | WeakRef<RewardedInterstitialAd>;

	static initWithOwner(owner: WeakRef<RewardedAd> | WeakRef<InterstitialAd> | WeakRef<RewardedInterstitialAd>): GADFullScreenContentDelegateImpl {
		const delegate = <GADFullScreenContentDelegateImpl>GADFullScreenContentDelegateImpl.new();
		delegate._owner = owner;
		return delegate;
	}

	adDidDismissFullScreenContent(ad: GADFullScreenPresentingAd): void {
		this._owner?.get()?._onAdEvent?.(AdEventType.CLOSED, null, this._owner.get?.());
		this._owner?.get()?._setLoaded(false);
	}

	adDidFailToPresentFullScreenContentWithError(ad: GADFullScreenPresentingAd, error: NSError): void {
		this._owner?.get()?._onAdEvent?.(AdEventType.FAILED_TO_SHOW_FULL_SCREEN_CONTENT, AdmobError.fromNative(error), this._owner.get?.());
	}

	adDidPresentFullScreenContent(ad: GADFullScreenPresentingAd): void {
		this._owner?.get()?._onAdEvent?.(AdEventType.OPENED, null, this._owner.get?.());
	}

	adDidRecordClick(ad: GADFullScreenPresentingAd) {
		this._owner?.get()?._onAdEvent?.(AdEventType.CLICKED, null, this._owner.get?.());
	}

	adDidRecordImpression(ad: GADFullScreenPresentingAd): void {
		this._owner?.get()?._onAdEvent?.(AdEventType.IMPRESSION, null, this._owner.get?.());
	}

	adWillDismissFullScreenContent(ad: GADFullScreenPresentingAd): void {}
}

@NativeClass
@ObjCClass(GADBannerViewDelegate)
class GADBannerViewDelegateImpl extends NSObject implements GADBannerViewDelegate {
	_owner: WeakRef<BannerAd>;

	static initWithOwner(owner: WeakRef<BannerAd>): GADBannerViewDelegateImpl {
		const delegate = <GADBannerViewDelegateImpl>GADBannerViewDelegateImpl.new();
		delegate._owner = owner;
		return delegate;
	}

	bannerViewDidDismissScreen(bannerView: GADBannerView): void {
		this._owner?.get()?.notify?.({
			eventName: AdEventType.CLOSED,
			object: this._owner?.get(),
		});
	}

	bannerViewDidFailToReceiveAdWithError(bannerView: GADBannerView, error: NSError): void {
		this._owner?.get()?.notify?.({
			eventName: AdEventType.FAILED_TO_LOAD_EVENT,
			object: this._owner?.get(),
			error: AdmobError.fromNative(error),
		});
	}

	bannerViewDidReceiveAd?(bannerView: GADBannerView): void {
		this._owner?.get()?.notify?.({
			eventName: AdEventType.LOADED,
			object: this._owner?.get(),
		});
		this._owner?.get()?._setIsLoading(false);
	}

	bannerViewDidRecordClick?(bannerView: GADBannerView): void {
		this._owner?.get()?.notify?.({
			eventName: AdEventType.CLICKED,
			object: this._owner?.get(),
		});
	}

	bannerViewDidRecordImpression?(bannerView: GADBannerView): void {
		this._owner?.get()?.notify?.({
			eventName: AdEventType.IMPRESSION,
			object: this._owner?.get(),
		});
	}

	bannerViewWillDismissScreen?(bannerView: GADBannerView): void {}

	bannerViewWillPresentScreen?(bannerView: GADBannerView): void {}
}
