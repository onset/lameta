var Xe = Object.defineProperty;
var Me = (i) => {
  throw TypeError(i);
};
var Ze = (i, e, t) => e in i ? Xe(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[e] = t;
var he = (i, e, t) => Ze(i, typeof e != "symbol" ? e + "" : e, t), ye = (i, e, t) => e.has(i) || Me("Cannot " + t);
var f = (i, e, t) => (ye(i, e, "read from private field"), t ? t.call(i) : e.get(i)), I = (i, e, t) => e.has(i) ? Me("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(i) : e.set(i, t), x = (i, e, t, r) => (ye(i, e, "write to private field"), r ? r.call(i, t) : e.set(i, t), t), A = (i, e, t) => (ye(i, e, "access private method"), t);
var et = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
(function() {
  (function(i) {
    (function(e) {
      var t = {
        searchParams: "URLSearchParams" in i,
        iterable: "Symbol" in i && "iterator" in Symbol,
        blob: "FileReader" in i && "Blob" in i && function() {
          try {
            return new Blob(), !0;
          } catch {
            return !1;
          }
        }(),
        formData: "FormData" in i,
        arrayBuffer: "ArrayBuffer" in i
      };
      function r(h) {
        return h && DataView.prototype.isPrototypeOf(h);
      }
      if (t.arrayBuffer)
        var o = [
          "[object Int8Array]",
          "[object Uint8Array]",
          "[object Uint8ClampedArray]",
          "[object Int16Array]",
          "[object Uint16Array]",
          "[object Int32Array]",
          "[object Uint32Array]",
          "[object Float32Array]",
          "[object Float64Array]"
        ], s = ArrayBuffer.isView || function(h) {
          return h && o.indexOf(Object.prototype.toString.call(h)) > -1;
        };
      function c(h) {
        if (typeof h != "string" && (h = String(h)), /[^a-z0-9\-#$%&'*+.^_`|~]/i.test(h))
          throw new TypeError("Invalid character in header field name");
        return h.toLowerCase();
      }
      function n(h) {
        return typeof h != "string" && (h = String(h)), h;
      }
      function p(h) {
        var g = {
          next: function() {
            var u = h.shift();
            return { done: u === void 0, value: u };
          }
        };
        return t.iterable && (g[Symbol.iterator] = function() {
          return g;
        }), g;
      }
      function l(h) {
        this.map = {}, h instanceof l ? h.forEach(function(g, u) {
          this.append(u, g);
        }, this) : Array.isArray(h) ? h.forEach(function(g) {
          this.append(g[0], g[1]);
        }, this) : h && Object.getOwnPropertyNames(h).forEach(function(g) {
          this.append(g, h[g]);
        }, this);
      }
      l.prototype.append = function(h, g) {
        h = c(h), g = n(g);
        var u = this.map[h];
        this.map[h] = u ? u + ", " + g : g;
      }, l.prototype.delete = function(h) {
        delete this.map[c(h)];
      }, l.prototype.get = function(h) {
        return h = c(h), this.has(h) ? this.map[h] : null;
      }, l.prototype.has = function(h) {
        return this.map.hasOwnProperty(c(h));
      }, l.prototype.set = function(h, g) {
        this.map[c(h)] = n(g);
      }, l.prototype.forEach = function(h, g) {
        for (var u in this.map)
          this.map.hasOwnProperty(u) && h.call(g, this.map[u], u, this);
      }, l.prototype.keys = function() {
        var h = [];
        return this.forEach(function(g, u) {
          h.push(u);
        }), p(h);
      }, l.prototype.values = function() {
        var h = [];
        return this.forEach(function(g) {
          h.push(g);
        }), p(h);
      }, l.prototype.entries = function() {
        var h = [];
        return this.forEach(function(g, u) {
          h.push([u, g]);
        }), p(h);
      }, t.iterable && (l.prototype[Symbol.iterator] = l.prototype.entries);
      function y(h) {
        if (h.bodyUsed)
          return Promise.reject(new TypeError("Already read"));
        h.bodyUsed = !0;
      }
      function C(h) {
        return new Promise(function(g, u) {
          h.onload = function() {
            g(h.result);
          }, h.onerror = function() {
            u(h.error);
          };
        });
      }
      function w(h) {
        var g = new FileReader(), u = C(g);
        return g.readAsArrayBuffer(h), u;
      }
      function ie(h) {
        var g = new FileReader(), u = C(g);
        return g.readAsText(h), u;
      }
      function F(h) {
        for (var g = new Uint8Array(h), u = new Array(g.length), T = 0; T < g.length; T++)
          u[T] = String.fromCharCode(g[T]);
        return u.join("");
      }
      function q(h) {
        if (h.slice)
          return h.slice(0);
        var g = new Uint8Array(h.byteLength);
        return g.set(new Uint8Array(h)), g.buffer;
      }
      function Q() {
        return this.bodyUsed = !1, this._initBody = function(h) {
          this._bodyInit = h, h ? typeof h == "string" ? this._bodyText = h : t.blob && Blob.prototype.isPrototypeOf(h) ? this._bodyBlob = h : t.formData && FormData.prototype.isPrototypeOf(h) ? this._bodyFormData = h : t.searchParams && URLSearchParams.prototype.isPrototypeOf(h) ? this._bodyText = h.toString() : t.arrayBuffer && t.blob && r(h) ? (this._bodyArrayBuffer = q(h.buffer), this._bodyInit = new Blob([this._bodyArrayBuffer])) : t.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(h) || s(h)) ? this._bodyArrayBuffer = q(h) : this._bodyText = h = Object.prototype.toString.call(h) : this._bodyText = "", this.headers.get("content-type") || (typeof h == "string" ? this.headers.set("content-type", "text/plain;charset=UTF-8") : this._bodyBlob && this._bodyBlob.type ? this.headers.set("content-type", this._bodyBlob.type) : t.searchParams && URLSearchParams.prototype.isPrototypeOf(h) && this.headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8"));
        }, t.blob && (this.blob = function() {
          var h = y(this);
          if (h)
            return h;
          if (this._bodyBlob)
            return Promise.resolve(this._bodyBlob);
          if (this._bodyArrayBuffer)
            return Promise.resolve(new Blob([this._bodyArrayBuffer]));
          if (this._bodyFormData)
            throw new Error("could not read FormData body as blob");
          return Promise.resolve(new Blob([this._bodyText]));
        }, this.arrayBuffer = function() {
          return this._bodyArrayBuffer ? y(this) || Promise.resolve(this._bodyArrayBuffer) : this.blob().then(w);
        }), this.text = function() {
          var h = y(this);
          if (h)
            return h;
          if (this._bodyBlob)
            return ie(this._bodyBlob);
          if (this._bodyArrayBuffer)
            return Promise.resolve(F(this._bodyArrayBuffer));
          if (this._bodyFormData)
            throw new Error("could not read FormData body as text");
          return Promise.resolve(this._bodyText);
        }, t.formData && (this.formData = function() {
          return this.text().then(Qe);
        }), this.json = function() {
          return this.text().then(JSON.parse);
        }, this;
      }
      var _e = ["DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT"];
      function Je(h) {
        var g = h.toUpperCase();
        return _e.indexOf(g) > -1 ? g : h;
      }
      function W(h, g) {
        g = g || {};
        var u = g.body;
        if (h instanceof W) {
          if (h.bodyUsed)
            throw new TypeError("Already read");
          this.url = h.url, this.credentials = h.credentials, g.headers || (this.headers = new l(h.headers)), this.method = h.method, this.mode = h.mode, this.signal = h.signal, !u && h._bodyInit != null && (u = h._bodyInit, h.bodyUsed = !0);
        } else
          this.url = String(h);
        if (this.credentials = g.credentials || this.credentials || "same-origin", (g.headers || !this.headers) && (this.headers = new l(g.headers)), this.method = Je(g.method || this.method || "GET"), this.mode = g.mode || this.mode || null, this.signal = g.signal || this.signal, this.referrer = null, (this.method === "GET" || this.method === "HEAD") && u)
          throw new TypeError("Body not allowed for GET or HEAD requests");
        this._initBody(u);
      }
      W.prototype.clone = function() {
        return new W(this, { body: this._bodyInit });
      };
      function Qe(h) {
        var g = new FormData();
        return h.trim().split("&").forEach(function(u) {
          if (u) {
            var T = u.split("="), P = T.shift().replace(/\+/g, " "), S = T.join("=").replace(/\+/g, " ");
            g.append(decodeURIComponent(P), decodeURIComponent(S));
          }
        }), g;
      }
      function Ye(h) {
        var g = new l(), u = h.replace(/\r?\n[\t ]+/g, " ");
        return u.split(/\r?\n/).forEach(function(T) {
          var P = T.split(":"), S = P.shift().trim();
          if (S) {
            var se = P.join(":").trim();
            g.append(S, se);
          }
        }), g;
      }
      Q.call(W.prototype);
      function k(h, g) {
        g || (g = {}), this.type = "default", this.status = g.status === void 0 ? 200 : g.status, this.ok = this.status >= 200 && this.status < 300, this.statusText = "statusText" in g ? g.statusText : "OK", this.headers = new l(g.headers), this.url = g.url || "", this._initBody(h);
      }
      Q.call(k.prototype), k.prototype.clone = function() {
        return new k(this._bodyInit, {
          status: this.status,
          statusText: this.statusText,
          headers: new l(this.headers),
          url: this.url
        });
      }, k.error = function() {
        var h = new k(null, { status: 0, statusText: "" });
        return h.type = "error", h;
      };
      var Ke = [301, 302, 303, 307, 308];
      k.redirect = function(h, g) {
        if (Ke.indexOf(g) === -1)
          throw new RangeError("Invalid status code");
        return new k(null, { status: g, headers: { location: h } });
      }, e.DOMException = i.DOMException;
      try {
        new e.DOMException();
      } catch {
        e.DOMException = function(g, u) {
          this.message = g, this.name = u;
          var T = Error(g);
          this.stack = T.stack;
        }, e.DOMException.prototype = Object.create(Error.prototype), e.DOMException.prototype.constructor = e.DOMException;
      }
      function ue(h, g) {
        return new Promise(function(u, T) {
          var P = new W(h, g);
          if (P.signal && P.signal.aborted)
            return T(new e.DOMException("Aborted", "AbortError"));
          var S = new XMLHttpRequest();
          function se() {
            S.abort();
          }
          S.onload = function() {
            var Y = {
              status: S.status,
              statusText: S.statusText,
              headers: Ye(S.getAllResponseHeaders() || "")
            };
            Y.url = "responseURL" in S ? S.responseURL : Y.headers.get("X-Request-URL");
            var de = "response" in S ? S.response : S.responseText;
            u(new k(de, Y));
          }, S.onerror = function() {
            T(new TypeError("Network request failed"));
          }, S.ontimeout = function() {
            T(new TypeError("Network request failed"));
          }, S.onabort = function() {
            T(new e.DOMException("Aborted", "AbortError"));
          }, S.open(P.method, P.url, !0), P.credentials === "include" ? S.withCredentials = !0 : P.credentials === "omit" && (S.withCredentials = !1), "responseType" in S && t.blob && (S.responseType = "blob"), P.headers.forEach(function(Y, de) {
            S.setRequestHeader(de, Y);
          }), P.signal && (P.signal.addEventListener("abort", se), S.onreadystatechange = function() {
            S.readyState === 4 && P.signal.removeEventListener("abort", se);
          }), S.send(typeof P._bodyInit > "u" ? null : P._bodyInit);
        });
      }
      return ue.polyfill = !0, i.fetch || (i.fetch = ue, i.Headers = l, i.Request = W, i.Response = k), e.Headers = l, e.Request = W, e.Response = k, e.fetch = ue, Object.defineProperty(e, "__esModule", { value: !0 }), e;
    })({});
  })(typeof self < "u" ? self : et);
})();
const Fe = {}, ve = "ro-crate-metadata.json", tt = ["ro-crate-metadata.json", "ro-crate-metadata.jsonld"], rt = {
  "@type": "Dataset",
  "@id": "./"
}, at = {
  "@type": "CreativeWork",
  "@id": ve,
  identifier: ve,
  about: { "@id": "./" }
}, ot = new Set(Object.values(Fe)), it = {
  "https://w3id.org/ro/crate/1.1/context": {
    "@id": "https://w3id.org/ro/crate/1.1/context",
    name: [
      "RO-Crate JSON-LD Context"
    ],
    version: "1.1.1",
    url: {
      "@id": "https://w3id.org/ro/crate/1.1"
    },
    schemaVersion: {
      "@id": "http://schema.org/version/10.0/"
    },
    isBasedOn: [
      {
        "@id": "http://schema.org/version/10.0/"
      },
      {
        "@id": "https://pcdm.org/2016/04/18/models"
      },
      {
        "@id": "https://bioschemas.org/profiles/ComputationalWorkflow/0.5-DRAFT-2020_07_21"
      },
      {
        "@id": "https://bioschemas.org/profiles/FormalParameter/0.1-DRAFT-2020_07_21"
      }
    ],
    license: {
      "@id": "https://creativecommons.org/publicdomain/zero/1.0/"
    },
    "@context": {
      "3DModel": "http://schema.org/3DModel",
      AMRadioChannel: "http://schema.org/AMRadioChannel",
      APIReference: "http://schema.org/APIReference",
      Abdomen: "http://schema.org/Abdomen",
      AboutPage: "http://schema.org/AboutPage",
      AcceptAction: "http://schema.org/AcceptAction",
      Accommodation: "http://schema.org/Accommodation",
      AccountingService: "http://schema.org/AccountingService",
      AchieveAction: "http://schema.org/AchieveAction",
      Action: "http://schema.org/Action",
      ActionAccessSpecification: "http://schema.org/ActionAccessSpecification",
      ActionStatusType: "http://schema.org/ActionStatusType",
      ActivateAction: "http://schema.org/ActivateAction",
      ActiveActionStatus: "http://schema.org/ActiveActionStatus",
      ActiveNotRecruiting: "http://schema.org/ActiveNotRecruiting",
      AddAction: "http://schema.org/AddAction",
      AdministrativeArea: "http://schema.org/AdministrativeArea",
      AdultEntertainment: "http://schema.org/AdultEntertainment",
      AdvertiserContentArticle: "http://schema.org/AdvertiserContentArticle",
      AerobicActivity: "http://schema.org/AerobicActivity",
      AggregateOffer: "http://schema.org/AggregateOffer",
      AggregateRating: "http://schema.org/AggregateRating",
      AgreeAction: "http://schema.org/AgreeAction",
      Airline: "http://schema.org/Airline",
      Airport: "http://schema.org/Airport",
      AlbumRelease: "http://schema.org/AlbumRelease",
      AlignmentObject: "http://schema.org/AlignmentObject",
      AllWheelDriveConfiguration: "http://schema.org/AllWheelDriveConfiguration",
      AllocateAction: "http://schema.org/AllocateAction",
      AmusementPark: "http://schema.org/AmusementPark",
      AnaerobicActivity: "http://schema.org/AnaerobicActivity",
      AnalysisNewsArticle: "http://schema.org/AnalysisNewsArticle",
      AnatomicalStructure: "http://schema.org/AnatomicalStructure",
      AnatomicalSystem: "http://schema.org/AnatomicalSystem",
      Anesthesia: "http://schema.org/Anesthesia",
      AnimalShelter: "http://schema.org/AnimalShelter",
      Answer: "http://schema.org/Answer",
      Apartment: "http://schema.org/Apartment",
      ApartmentComplex: "http://schema.org/ApartmentComplex",
      Appearance: "http://schema.org/Appearance",
      AppendAction: "http://schema.org/AppendAction",
      ApplyAction: "http://schema.org/ApplyAction",
      ApprovedIndication: "http://schema.org/ApprovedIndication",
      Aquarium: "http://schema.org/Aquarium",
      ArchiveComponent: "http://schema.org/ArchiveComponent",
      ArchiveOrganization: "http://schema.org/ArchiveOrganization",
      ArriveAction: "http://schema.org/ArriveAction",
      ArtGallery: "http://schema.org/ArtGallery",
      Artery: "http://schema.org/Artery",
      Article: "http://schema.org/Article",
      AskAction: "http://schema.org/AskAction",
      AskPublicNewsArticle: "http://schema.org/AskPublicNewsArticle",
      AssessAction: "http://schema.org/AssessAction",
      AssignAction: "http://schema.org/AssignAction",
      Atlas: "http://schema.org/Atlas",
      Attorney: "http://schema.org/Attorney",
      Audience: "http://schema.org/Audience",
      AudioObject: "http://schema.org/AudioObject",
      Audiobook: "http://schema.org/Audiobook",
      AudiobookFormat: "http://schema.org/AudiobookFormat",
      AuthenticContent: "http://schema.org/AuthenticContent",
      AuthoritativeLegalValue: "http://schema.org/AuthoritativeLegalValue",
      AuthorizeAction: "http://schema.org/AuthorizeAction",
      AutoBodyShop: "http://schema.org/AutoBodyShop",
      AutoDealer: "http://schema.org/AutoDealer",
      AutoPartsStore: "http://schema.org/AutoPartsStore",
      AutoRental: "http://schema.org/AutoRental",
      AutoRepair: "http://schema.org/AutoRepair",
      AutoWash: "http://schema.org/AutoWash",
      AutomatedTeller: "http://schema.org/AutomatedTeller",
      AutomotiveBusiness: "http://schema.org/AutomotiveBusiness",
      Ayurvedic: "http://schema.org/Ayurvedic",
      BackgroundNewsArticle: "http://schema.org/BackgroundNewsArticle",
      Bacteria: "http://schema.org/Bacteria",
      Bakery: "http://schema.org/Bakery",
      Balance: "http://schema.org/Balance",
      BankAccount: "http://schema.org/BankAccount",
      BankOrCreditUnion: "http://schema.org/BankOrCreditUnion",
      BarOrPub: "http://schema.org/BarOrPub",
      Barcode: "http://schema.org/Barcode",
      BasicIncome: "http://schema.org/BasicIncome",
      Beach: "http://schema.org/Beach",
      BeautySalon: "http://schema.org/BeautySalon",
      BedAndBreakfast: "http://schema.org/BedAndBreakfast",
      BedDetails: "http://schema.org/BedDetails",
      BedType: "http://schema.org/BedType",
      BefriendAction: "http://schema.org/BefriendAction",
      BenefitsHealthAspect: "http://schema.org/BenefitsHealthAspect",
      BikeStore: "http://schema.org/BikeStore",
      Blog: "http://schema.org/Blog",
      BlogPosting: "http://schema.org/BlogPosting",
      BloodTest: "http://schema.org/BloodTest",
      BoardingPolicyType: "http://schema.org/BoardingPolicyType",
      BoatReservation: "http://schema.org/BoatReservation",
      BoatTerminal: "http://schema.org/BoatTerminal",
      BoatTrip: "http://schema.org/BoatTrip",
      BodyOfWater: "http://schema.org/BodyOfWater",
      Bone: "http://schema.org/Bone",
      Book: "http://schema.org/Book",
      BookFormatType: "http://schema.org/BookFormatType",
      BookSeries: "http://schema.org/BookSeries",
      BookStore: "http://schema.org/BookStore",
      BookmarkAction: "http://schema.org/BookmarkAction",
      Boolean: "http://schema.org/Boolean",
      BorrowAction: "http://schema.org/BorrowAction",
      BowlingAlley: "http://schema.org/BowlingAlley",
      BrainStructure: "http://schema.org/BrainStructure",
      Brand: "http://schema.org/Brand",
      BreadcrumbList: "http://schema.org/BreadcrumbList",
      Brewery: "http://schema.org/Brewery",
      Bridge: "http://schema.org/Bridge",
      BroadcastChannel: "http://schema.org/BroadcastChannel",
      BroadcastEvent: "http://schema.org/BroadcastEvent",
      BroadcastFrequencySpecification: "http://schema.org/BroadcastFrequencySpecification",
      BroadcastRelease: "http://schema.org/BroadcastRelease",
      BroadcastService: "http://schema.org/BroadcastService",
      BrokerageAccount: "http://schema.org/BrokerageAccount",
      BuddhistTemple: "http://schema.org/BuddhistTemple",
      BusOrCoach: "http://schema.org/BusOrCoach",
      BusReservation: "http://schema.org/BusReservation",
      BusStation: "http://schema.org/BusStation",
      BusStop: "http://schema.org/BusStop",
      BusTrip: "http://schema.org/BusTrip",
      BusinessAudience: "http://schema.org/BusinessAudience",
      BusinessEntityType: "http://schema.org/BusinessEntityType",
      BusinessEvent: "http://schema.org/BusinessEvent",
      BusinessFunction: "http://schema.org/BusinessFunction",
      BusinessSupport: "http://schema.org/BusinessSupport",
      BuyAction: "http://schema.org/BuyAction",
      CDCPMDRecord: "http://schema.org/CDCPMDRecord",
      CDFormat: "http://schema.org/CDFormat",
      CT: "http://schema.org/CT",
      CableOrSatelliteService: "http://schema.org/CableOrSatelliteService",
      CafeOrCoffeeShop: "http://schema.org/CafeOrCoffeeShop",
      Campground: "http://schema.org/Campground",
      CampingPitch: "http://schema.org/CampingPitch",
      Canal: "http://schema.org/Canal",
      CancelAction: "http://schema.org/CancelAction",
      Car: "http://schema.org/Car",
      CarUsageType: "http://schema.org/CarUsageType",
      Cardiovascular: "http://schema.org/Cardiovascular",
      CardiovascularExam: "http://schema.org/CardiovascularExam",
      CaseSeries: "http://schema.org/CaseSeries",
      Casino: "http://schema.org/Casino",
      CassetteFormat: "http://schema.org/CassetteFormat",
      CategoryCode: "http://schema.org/CategoryCode",
      CategoryCodeSet: "http://schema.org/CategoryCodeSet",
      CatholicChurch: "http://schema.org/CatholicChurch",
      CausesHealthAspect: "http://schema.org/CausesHealthAspect",
      Cemetery: "http://schema.org/Cemetery",
      Chapter: "http://schema.org/Chapter",
      CharitableIncorporatedOrganization: "http://schema.org/CharitableIncorporatedOrganization",
      CheckAction: "http://schema.org/CheckAction",
      CheckInAction: "http://schema.org/CheckInAction",
      CheckOutAction: "http://schema.org/CheckOutAction",
      CheckoutPage: "http://schema.org/CheckoutPage",
      ChildCare: "http://schema.org/ChildCare",
      ChildrensEvent: "http://schema.org/ChildrensEvent",
      Chiropractic: "http://schema.org/Chiropractic",
      ChooseAction: "http://schema.org/ChooseAction",
      Church: "http://schema.org/Church",
      City: "http://schema.org/City",
      CityHall: "http://schema.org/CityHall",
      CivicStructure: "http://schema.org/CivicStructure",
      Claim: "http://schema.org/Claim",
      ClaimReview: "http://schema.org/ClaimReview",
      Class: "http://schema.org/Class",
      Clinician: "http://schema.org/Clinician",
      Clip: "http://schema.org/Clip",
      ClothingStore: "http://schema.org/ClothingStore",
      CoOp: "http://schema.org/CoOp",
      Code: "http://schema.org/Code",
      CohortStudy: "http://schema.org/CohortStudy",
      Collection: "http://schema.org/Collection",
      CollectionPage: "http://schema.org/CollectionPage",
      CollegeOrUniversity: "http://schema.org/CollegeOrUniversity",
      ComedyClub: "http://schema.org/ComedyClub",
      ComedyEvent: "http://schema.org/ComedyEvent",
      ComicCoverArt: "http://schema.org/ComicCoverArt",
      ComicIssue: "http://schema.org/ComicIssue",
      ComicSeries: "http://schema.org/ComicSeries",
      ComicStory: "http://schema.org/ComicStory",
      Comment: "http://schema.org/Comment",
      CommentAction: "http://schema.org/CommentAction",
      CommentPermission: "http://schema.org/CommentPermission",
      CommunicateAction: "http://schema.org/CommunicateAction",
      CommunityHealth: "http://schema.org/CommunityHealth",
      CompilationAlbum: "http://schema.org/CompilationAlbum",
      CompleteDataFeed: "http://schema.org/CompleteDataFeed",
      Completed: "http://schema.org/Completed",
      CompletedActionStatus: "http://schema.org/CompletedActionStatus",
      CompoundPriceSpecification: "http://schema.org/CompoundPriceSpecification",
      ComputerLanguage: "http://schema.org/ComputerLanguage",
      ComputerStore: "http://schema.org/ComputerStore",
      ConfirmAction: "http://schema.org/ConfirmAction",
      Consortium: "http://schema.org/Consortium",
      ConsumeAction: "http://schema.org/ConsumeAction",
      ContactPage: "http://schema.org/ContactPage",
      ContactPoint: "http://schema.org/ContactPoint",
      ContactPointOption: "http://schema.org/ContactPointOption",
      ContagiousnessHealthAspect: "http://schema.org/ContagiousnessHealthAspect",
      Continent: "http://schema.org/Continent",
      ControlAction: "http://schema.org/ControlAction",
      ConvenienceStore: "http://schema.org/ConvenienceStore",
      Conversation: "http://schema.org/Conversation",
      CookAction: "http://schema.org/CookAction",
      Corporation: "http://schema.org/Corporation",
      CorrectionComment: "http://schema.org/CorrectionComment",
      Country: "http://schema.org/Country",
      Course: "http://schema.org/Course",
      CourseInstance: "http://schema.org/CourseInstance",
      Courthouse: "http://schema.org/Courthouse",
      CoverArt: "http://schema.org/CoverArt",
      CovidTestingFacility: "http://schema.org/CovidTestingFacility",
      CreateAction: "http://schema.org/CreateAction",
      CreativeWork: "http://schema.org/CreativeWork",
      CreativeWorkSeason: "http://schema.org/CreativeWorkSeason",
      CreativeWorkSeries: "http://schema.org/CreativeWorkSeries",
      CreditCard: "http://schema.org/CreditCard",
      Crematorium: "http://schema.org/Crematorium",
      CriticReview: "http://schema.org/CriticReview",
      CrossSectional: "http://schema.org/CrossSectional",
      CssSelectorType: "http://schema.org/CssSelectorType",
      CurrencyConversionService: "http://schema.org/CurrencyConversionService",
      DDxElement: "http://schema.org/DDxElement",
      DJMixAlbum: "http://schema.org/DJMixAlbum",
      DVDFormat: "http://schema.org/DVDFormat",
      DamagedCondition: "http://schema.org/DamagedCondition",
      DanceEvent: "http://schema.org/DanceEvent",
      DanceGroup: "http://schema.org/DanceGroup",
      DataCatalog: "http://schema.org/DataCatalog",
      DataDownload: "http://schema.org/DataDownload",
      DataFeed: "http://schema.org/DataFeed",
      DataFeedItem: "http://schema.org/DataFeedItem",
      DataType: "http://schema.org/DataType",
      Dataset: "http://schema.org/Dataset",
      Date: "http://schema.org/Date",
      DateTime: "http://schema.org/DateTime",
      DatedMoneySpecification: "http://schema.org/DatedMoneySpecification",
      DayOfWeek: "http://schema.org/DayOfWeek",
      DaySpa: "http://schema.org/DaySpa",
      DeactivateAction: "http://schema.org/DeactivateAction",
      DefenceEstablishment: "http://schema.org/DefenceEstablishment",
      DefinedRegion: "http://schema.org/DefinedRegion",
      DefinedTerm: "http://schema.org/DefinedTerm",
      DefinedTermSet: "http://schema.org/DefinedTermSet",
      DefinitiveLegalValue: "http://schema.org/DefinitiveLegalValue",
      DeleteAction: "http://schema.org/DeleteAction",
      DeliveryChargeSpecification: "http://schema.org/DeliveryChargeSpecification",
      DeliveryEvent: "http://schema.org/DeliveryEvent",
      DeliveryMethod: "http://schema.org/DeliveryMethod",
      DeliveryTimeSettings: "http://schema.org/DeliveryTimeSettings",
      Demand: "http://schema.org/Demand",
      DemoAlbum: "http://schema.org/DemoAlbum",
      Dentist: "http://schema.org/Dentist",
      Dentistry: "http://schema.org/Dentistry",
      DepartAction: "http://schema.org/DepartAction",
      DepartmentStore: "http://schema.org/DepartmentStore",
      DepositAccount: "http://schema.org/DepositAccount",
      Dermatologic: "http://schema.org/Dermatologic",
      Dermatology: "http://schema.org/Dermatology",
      DiabeticDiet: "http://schema.org/DiabeticDiet",
      Diagnostic: "http://schema.org/Diagnostic",
      DiagnosticLab: "http://schema.org/DiagnosticLab",
      DiagnosticProcedure: "http://schema.org/DiagnosticProcedure",
      Diet: "http://schema.org/Diet",
      DietNutrition: "http://schema.org/DietNutrition",
      DietarySupplement: "http://schema.org/DietarySupplement",
      DigitalAudioTapeFormat: "http://schema.org/DigitalAudioTapeFormat",
      DigitalDocument: "http://schema.org/DigitalDocument",
      DigitalDocumentPermission: "http://schema.org/DigitalDocumentPermission",
      DigitalDocumentPermissionType: "http://schema.org/DigitalDocumentPermissionType",
      DigitalFormat: "http://schema.org/DigitalFormat",
      DisabilitySupport: "http://schema.org/DisabilitySupport",
      DisagreeAction: "http://schema.org/DisagreeAction",
      Discontinued: "http://schema.org/Discontinued",
      DiscoverAction: "http://schema.org/DiscoverAction",
      DiscussionForumPosting: "http://schema.org/DiscussionForumPosting",
      DislikeAction: "http://schema.org/DislikeAction",
      Distance: "http://schema.org/Distance",
      Distillery: "http://schema.org/Distillery",
      DonateAction: "http://schema.org/DonateAction",
      DoseSchedule: "http://schema.org/DoseSchedule",
      DoubleBlindedTrial: "http://schema.org/DoubleBlindedTrial",
      DownloadAction: "http://schema.org/DownloadAction",
      DrawAction: "http://schema.org/DrawAction",
      Drawing: "http://schema.org/Drawing",
      DrinkAction: "http://schema.org/DrinkAction",
      DriveWheelConfigurationValue: "http://schema.org/DriveWheelConfigurationValue",
      DrivingSchoolVehicleUsage: "http://schema.org/DrivingSchoolVehicleUsage",
      Drug: "http://schema.org/Drug",
      DrugClass: "http://schema.org/DrugClass",
      DrugCost: "http://schema.org/DrugCost",
      DrugCostCategory: "http://schema.org/DrugCostCategory",
      DrugLegalStatus: "http://schema.org/DrugLegalStatus",
      DrugPregnancyCategory: "http://schema.org/DrugPregnancyCategory",
      DrugPrescriptionStatus: "http://schema.org/DrugPrescriptionStatus",
      DrugStrength: "http://schema.org/DrugStrength",
      DryCleaningOrLaundry: "http://schema.org/DryCleaningOrLaundry",
      Duration: "http://schema.org/Duration",
      EBook: "http://schema.org/EBook",
      EPRelease: "http://schema.org/EPRelease",
      EUEnergyEfficiencyCategoryA: "http://schema.org/EUEnergyEfficiencyCategoryA",
      EUEnergyEfficiencyCategoryA1Plus: "http://schema.org/EUEnergyEfficiencyCategoryA1Plus",
      EUEnergyEfficiencyCategoryA2Plus: "http://schema.org/EUEnergyEfficiencyCategoryA2Plus",
      EUEnergyEfficiencyCategoryA3Plus: "http://schema.org/EUEnergyEfficiencyCategoryA3Plus",
      EUEnergyEfficiencyCategoryB: "http://schema.org/EUEnergyEfficiencyCategoryB",
      EUEnergyEfficiencyCategoryC: "http://schema.org/EUEnergyEfficiencyCategoryC",
      EUEnergyEfficiencyCategoryD: "http://schema.org/EUEnergyEfficiencyCategoryD",
      EUEnergyEfficiencyCategoryE: "http://schema.org/EUEnergyEfficiencyCategoryE",
      EUEnergyEfficiencyCategoryF: "http://schema.org/EUEnergyEfficiencyCategoryF",
      EUEnergyEfficiencyCategoryG: "http://schema.org/EUEnergyEfficiencyCategoryG",
      EUEnergyEfficiencyEnumeration: "http://schema.org/EUEnergyEfficiencyEnumeration",
      Ear: "http://schema.org/Ear",
      EatAction: "http://schema.org/EatAction",
      EducationEvent: "http://schema.org/EducationEvent",
      EducationalAudience: "http://schema.org/EducationalAudience",
      EducationalOccupationalCredential: "http://schema.org/EducationalOccupationalCredential",
      EducationalOccupationalProgram: "http://schema.org/EducationalOccupationalProgram",
      EducationalOrganization: "http://schema.org/EducationalOrganization",
      Electrician: "http://schema.org/Electrician",
      ElectronicsStore: "http://schema.org/ElectronicsStore",
      ElementarySchool: "http://schema.org/ElementarySchool",
      EmailMessage: "http://schema.org/EmailMessage",
      Embassy: "http://schema.org/Embassy",
      Emergency: "http://schema.org/Emergency",
      EmergencyService: "http://schema.org/EmergencyService",
      EmployeeRole: "http://schema.org/EmployeeRole",
      EmployerAggregateRating: "http://schema.org/EmployerAggregateRating",
      EmployerReview: "http://schema.org/EmployerReview",
      EmploymentAgency: "http://schema.org/EmploymentAgency",
      Endocrine: "http://schema.org/Endocrine",
      EndorseAction: "http://schema.org/EndorseAction",
      EndorsementRating: "http://schema.org/EndorsementRating",
      Energy: "http://schema.org/Energy",
      EnergyConsumptionDetails: "http://schema.org/EnergyConsumptionDetails",
      EnergyEfficiencyEnumeration: "http://schema.org/EnergyEfficiencyEnumeration",
      EnergyStarCertified: "http://schema.org/EnergyStarCertified",
      EnergyStarEnergyEfficiencyEnumeration: "http://schema.org/EnergyStarEnergyEfficiencyEnumeration",
      EngineSpecification: "http://schema.org/EngineSpecification",
      EnrollingByInvitation: "http://schema.org/EnrollingByInvitation",
      EntertainmentBusiness: "http://schema.org/EntertainmentBusiness",
      EntryPoint: "http://schema.org/EntryPoint",
      Enumeration: "http://schema.org/Enumeration",
      Episode: "http://schema.org/Episode",
      Event: "http://schema.org/Event",
      EventAttendanceModeEnumeration: "http://schema.org/EventAttendanceModeEnumeration",
      EventCancelled: "http://schema.org/EventCancelled",
      EventMovedOnline: "http://schema.org/EventMovedOnline",
      EventPostponed: "http://schema.org/EventPostponed",
      EventRescheduled: "http://schema.org/EventRescheduled",
      EventReservation: "http://schema.org/EventReservation",
      EventScheduled: "http://schema.org/EventScheduled",
      EventSeries: "http://schema.org/EventSeries",
      EventStatusType: "http://schema.org/EventStatusType",
      EventVenue: "http://schema.org/EventVenue",
      EvidenceLevelA: "http://schema.org/EvidenceLevelA",
      EvidenceLevelB: "http://schema.org/EvidenceLevelB",
      EvidenceLevelC: "http://schema.org/EvidenceLevelC",
      ExchangeRateSpecification: "http://schema.org/ExchangeRateSpecification",
      ExchangeRefund: "http://schema.org/ExchangeRefund",
      ExerciseAction: "http://schema.org/ExerciseAction",
      ExerciseGym: "http://schema.org/ExerciseGym",
      ExercisePlan: "http://schema.org/ExercisePlan",
      ExhibitionEvent: "http://schema.org/ExhibitionEvent",
      Eye: "http://schema.org/Eye",
      FAQPage: "http://schema.org/FAQPage",
      FDAcategoryA: "http://schema.org/FDAcategoryA",
      FDAcategoryB: "http://schema.org/FDAcategoryB",
      FDAcategoryC: "http://schema.org/FDAcategoryC",
      FDAcategoryD: "http://schema.org/FDAcategoryD",
      FDAcategoryX: "http://schema.org/FDAcategoryX",
      FDAnotEvaluated: "http://schema.org/FDAnotEvaluated",
      FMRadioChannel: "http://schema.org/FMRadioChannel",
      FailedActionStatus: "http://schema.org/FailedActionStatus",
      False: "http://schema.org/False",
      FastFoodRestaurant: "http://schema.org/FastFoodRestaurant",
      Female: "http://schema.org/Female",
      Festival: "http://schema.org/Festival",
      FilmAction: "http://schema.org/FilmAction",
      FinancialProduct: "http://schema.org/FinancialProduct",
      FinancialService: "http://schema.org/FinancialService",
      FindAction: "http://schema.org/FindAction",
      FireStation: "http://schema.org/FireStation",
      Flexibility: "http://schema.org/Flexibility",
      Flight: "http://schema.org/Flight",
      FlightReservation: "http://schema.org/FlightReservation",
      Float: "http://schema.org/Float",
      FloorPlan: "http://schema.org/FloorPlan",
      Florist: "http://schema.org/Florist",
      FollowAction: "http://schema.org/FollowAction",
      FoodEstablishment: "http://schema.org/FoodEstablishment",
      FoodEstablishmentReservation: "http://schema.org/FoodEstablishmentReservation",
      FoodEvent: "http://schema.org/FoodEvent",
      FoodService: "http://schema.org/FoodService",
      FourWheelDriveConfiguration: "http://schema.org/FourWheelDriveConfiguration",
      Friday: "http://schema.org/Friday",
      FrontWheelDriveConfiguration: "http://schema.org/FrontWheelDriveConfiguration",
      FullRefund: "http://schema.org/FullRefund",
      FundingAgency: "http://schema.org/FundingAgency",
      FundingScheme: "http://schema.org/FundingScheme",
      Fungus: "http://schema.org/Fungus",
      FurnitureStore: "http://schema.org/FurnitureStore",
      Game: "http://schema.org/Game",
      GamePlayMode: "http://schema.org/GamePlayMode",
      GameServer: "http://schema.org/GameServer",
      GameServerStatus: "http://schema.org/GameServerStatus",
      GardenStore: "http://schema.org/GardenStore",
      GasStation: "http://schema.org/GasStation",
      Gastroenterologic: "http://schema.org/Gastroenterologic",
      GatedResidenceCommunity: "http://schema.org/GatedResidenceCommunity",
      GenderType: "http://schema.org/GenderType",
      GeneralContractor: "http://schema.org/GeneralContractor",
      Genetic: "http://schema.org/Genetic",
      Genitourinary: "http://schema.org/Genitourinary",
      GeoCircle: "http://schema.org/GeoCircle",
      GeoCoordinates: "http://schema.org/GeoCoordinates",
      GeoShape: "http://schema.org/GeoShape",
      GeospatialGeometry: "http://schema.org/GeospatialGeometry",
      Geriatric: "http://schema.org/Geriatric",
      GiveAction: "http://schema.org/GiveAction",
      GlutenFreeDiet: "http://schema.org/GlutenFreeDiet",
      GolfCourse: "http://schema.org/GolfCourse",
      GovernmentBenefitsType: "http://schema.org/GovernmentBenefitsType",
      GovernmentBuilding: "http://schema.org/GovernmentBuilding",
      GovernmentOffice: "http://schema.org/GovernmentOffice",
      GovernmentOrganization: "http://schema.org/GovernmentOrganization",
      GovernmentPermit: "http://schema.org/GovernmentPermit",
      GovernmentService: "http://schema.org/GovernmentService",
      Grant: "http://schema.org/Grant",
      GraphicNovel: "http://schema.org/GraphicNovel",
      GroceryStore: "http://schema.org/GroceryStore",
      GroupBoardingPolicy: "http://schema.org/GroupBoardingPolicy",
      Guide: "http://schema.org/Guide",
      Gynecologic: "http://schema.org/Gynecologic",
      HTML: "rdf:HTML",
      HVACBusiness: "http://schema.org/HVACBusiness",
      Hackathon: "http://schema.org/Hackathon",
      HairSalon: "http://schema.org/HairSalon",
      HalalDiet: "http://schema.org/HalalDiet",
      Hardcover: "http://schema.org/Hardcover",
      HardwareStore: "http://schema.org/HardwareStore",
      Head: "http://schema.org/Head",
      HealthAndBeautyBusiness: "http://schema.org/HealthAndBeautyBusiness",
      HealthAspectEnumeration: "http://schema.org/HealthAspectEnumeration",
      HealthCare: "http://schema.org/HealthCare",
      HealthClub: "http://schema.org/HealthClub",
      HealthInsurancePlan: "http://schema.org/HealthInsurancePlan",
      HealthPlanCostSharingSpecification: "http://schema.org/HealthPlanCostSharingSpecification",
      HealthPlanFormulary: "http://schema.org/HealthPlanFormulary",
      HealthPlanNetwork: "http://schema.org/HealthPlanNetwork",
      HealthTopicContent: "http://schema.org/HealthTopicContent",
      HearingImpairedSupported: "http://schema.org/HearingImpairedSupported",
      Hematologic: "http://schema.org/Hematologic",
      HighSchool: "http://schema.org/HighSchool",
      HinduDiet: "http://schema.org/HinduDiet",
      HinduTemple: "http://schema.org/HinduTemple",
      HobbyShop: "http://schema.org/HobbyShop",
      HomeAndConstructionBusiness: "http://schema.org/HomeAndConstructionBusiness",
      HomeGoodsStore: "http://schema.org/HomeGoodsStore",
      Homeopathic: "http://schema.org/Homeopathic",
      Hospital: "http://schema.org/Hospital",
      Hostel: "http://schema.org/Hostel",
      Hotel: "http://schema.org/Hotel",
      HotelRoom: "http://schema.org/HotelRoom",
      House: "http://schema.org/House",
      HousePainter: "http://schema.org/HousePainter",
      HowOrWhereHealthAspect: "http://schema.org/HowOrWhereHealthAspect",
      HowTo: "http://schema.org/HowTo",
      HowToDirection: "http://schema.org/HowToDirection",
      HowToItem: "http://schema.org/HowToItem",
      HowToSection: "http://schema.org/HowToSection",
      HowToStep: "http://schema.org/HowToStep",
      HowToSupply: "http://schema.org/HowToSupply",
      HowToTip: "http://schema.org/HowToTip",
      HowToTool: "http://schema.org/HowToTool",
      IceCreamShop: "http://schema.org/IceCreamShop",
      IgnoreAction: "http://schema.org/IgnoreAction",
      ImageGallery: "http://schema.org/ImageGallery",
      ImageObject: "http://schema.org/ImageObject",
      ImagingTest: "http://schema.org/ImagingTest",
      InForce: "http://schema.org/InForce",
      InStock: "http://schema.org/InStock",
      InStoreOnly: "http://schema.org/InStoreOnly",
      IndividualProduct: "http://schema.org/IndividualProduct",
      Infectious: "http://schema.org/Infectious",
      InfectiousAgentClass: "http://schema.org/InfectiousAgentClass",
      InfectiousDisease: "http://schema.org/InfectiousDisease",
      InformAction: "http://schema.org/InformAction",
      InsertAction: "http://schema.org/InsertAction",
      InstallAction: "http://schema.org/InstallAction",
      InsuranceAgency: "http://schema.org/InsuranceAgency",
      Intangible: "http://schema.org/Intangible",
      Integer: "http://schema.org/Integer",
      InteractAction: "http://schema.org/InteractAction",
      InteractionCounter: "http://schema.org/InteractionCounter",
      InternationalTrial: "http://schema.org/InternationalTrial",
      InternetCafe: "http://schema.org/InternetCafe",
      InvestmentFund: "http://schema.org/InvestmentFund",
      InvestmentOrDeposit: "http://schema.org/InvestmentOrDeposit",
      InviteAction: "http://schema.org/InviteAction",
      Invoice: "http://schema.org/Invoice",
      ItemAvailability: "http://schema.org/ItemAvailability",
      ItemList: "http://schema.org/ItemList",
      ItemListOrderAscending: "http://schema.org/ItemListOrderAscending",
      ItemListOrderDescending: "http://schema.org/ItemListOrderDescending",
      ItemListOrderType: "http://schema.org/ItemListOrderType",
      ItemListUnordered: "http://schema.org/ItemListUnordered",
      ItemPage: "http://schema.org/ItemPage",
      JewelryStore: "http://schema.org/JewelryStore",
      JobPosting: "http://schema.org/JobPosting",
      JoinAction: "http://schema.org/JoinAction",
      Joint: "http://schema.org/Joint",
      KosherDiet: "http://schema.org/KosherDiet",
      LaboratoryScience: "http://schema.org/LaboratoryScience",
      LakeBodyOfWater: "http://schema.org/LakeBodyOfWater",
      Landform: "http://schema.org/Landform",
      LandmarksOrHistoricalBuildings: "http://schema.org/LandmarksOrHistoricalBuildings",
      Language: "http://schema.org/Language",
      LaserDiscFormat: "http://schema.org/LaserDiscFormat",
      LearningResource: "http://schema.org/LearningResource",
      LeaveAction: "http://schema.org/LeaveAction",
      LeftHandDriving: "http://schema.org/LeftHandDriving",
      LegalForceStatus: "http://schema.org/LegalForceStatus",
      LegalService: "http://schema.org/LegalService",
      LegalValueLevel: "http://schema.org/LegalValueLevel",
      Legislation: "http://schema.org/Legislation",
      LegislationObject: "http://schema.org/LegislationObject",
      LegislativeBuilding: "http://schema.org/LegislativeBuilding",
      LeisureTimeActivity: "http://schema.org/LeisureTimeActivity",
      LendAction: "http://schema.org/LendAction",
      Library: "http://schema.org/Library",
      LibrarySystem: "http://schema.org/LibrarySystem",
      LifestyleModification: "http://schema.org/LifestyleModification",
      Ligament: "http://schema.org/Ligament",
      LikeAction: "http://schema.org/LikeAction",
      LimitedAvailability: "http://schema.org/LimitedAvailability",
      LimitedByGuaranteeCharity: "http://schema.org/LimitedByGuaranteeCharity",
      LinkRole: "http://schema.org/LinkRole",
      LiquorStore: "http://schema.org/LiquorStore",
      ListItem: "http://schema.org/ListItem",
      ListenAction: "http://schema.org/ListenAction",
      LiteraryEvent: "http://schema.org/LiteraryEvent",
      LiveAlbum: "http://schema.org/LiveAlbum",
      LiveBlogPosting: "http://schema.org/LiveBlogPosting",
      LivingWithHealthAspect: "http://schema.org/LivingWithHealthAspect",
      LoanOrCredit: "http://schema.org/LoanOrCredit",
      LocalBusiness: "http://schema.org/LocalBusiness",
      LocationFeatureSpecification: "http://schema.org/LocationFeatureSpecification",
      LockerDelivery: "http://schema.org/LockerDelivery",
      Locksmith: "http://schema.org/Locksmith",
      LodgingBusiness: "http://schema.org/LodgingBusiness",
      LodgingReservation: "http://schema.org/LodgingReservation",
      Longitudinal: "http://schema.org/Longitudinal",
      LoseAction: "http://schema.org/LoseAction",
      LowCalorieDiet: "http://schema.org/LowCalorieDiet",
      LowFatDiet: "http://schema.org/LowFatDiet",
      LowLactoseDiet: "http://schema.org/LowLactoseDiet",
      LowSaltDiet: "http://schema.org/LowSaltDiet",
      Lung: "http://schema.org/Lung",
      LymphaticVessel: "http://schema.org/LymphaticVessel",
      MRI: "http://schema.org/MRI",
      Male: "http://schema.org/Male",
      Manuscript: "http://schema.org/Manuscript",
      Map: "http://schema.org/Map",
      MapCategoryType: "http://schema.org/MapCategoryType",
      MarryAction: "http://schema.org/MarryAction",
      Mass: "http://schema.org/Mass",
      MaximumDoseSchedule: "http://schema.org/MaximumDoseSchedule",
      MayTreatHealthAspect: "http://schema.org/MayTreatHealthAspect",
      MediaGallery: "http://schema.org/MediaGallery",
      MediaManipulationRatingEnumeration: "http://schema.org/MediaManipulationRatingEnumeration",
      MediaObject: "http://schema.org/MediaObject",
      MediaReview: "http://schema.org/MediaReview",
      MediaSubscription: "http://schema.org/MediaSubscription",
      MedicalAudience: "http://schema.org/MedicalAudience",
      MedicalAudienceType: "http://schema.org/MedicalAudienceType",
      MedicalBusiness: "http://schema.org/MedicalBusiness",
      MedicalCause: "http://schema.org/MedicalCause",
      MedicalClinic: "http://schema.org/MedicalClinic",
      MedicalCode: "http://schema.org/MedicalCode",
      MedicalCondition: "http://schema.org/MedicalCondition",
      MedicalConditionStage: "http://schema.org/MedicalConditionStage",
      MedicalContraindication: "http://schema.org/MedicalContraindication",
      MedicalDevice: "http://schema.org/MedicalDevice",
      MedicalDevicePurpose: "http://schema.org/MedicalDevicePurpose",
      MedicalEntity: "http://schema.org/MedicalEntity",
      MedicalEnumeration: "http://schema.org/MedicalEnumeration",
      MedicalEvidenceLevel: "http://schema.org/MedicalEvidenceLevel",
      MedicalGuideline: "http://schema.org/MedicalGuideline",
      MedicalGuidelineContraindication: "http://schema.org/MedicalGuidelineContraindication",
      MedicalGuidelineRecommendation: "http://schema.org/MedicalGuidelineRecommendation",
      MedicalImagingTechnique: "http://schema.org/MedicalImagingTechnique",
      MedicalIndication: "http://schema.org/MedicalIndication",
      MedicalIntangible: "http://schema.org/MedicalIntangible",
      MedicalObservationalStudy: "http://schema.org/MedicalObservationalStudy",
      MedicalObservationalStudyDesign: "http://schema.org/MedicalObservationalStudyDesign",
      MedicalOrganization: "http://schema.org/MedicalOrganization",
      MedicalProcedure: "http://schema.org/MedicalProcedure",
      MedicalProcedureType: "http://schema.org/MedicalProcedureType",
      MedicalResearcher: "http://schema.org/MedicalResearcher",
      MedicalRiskCalculator: "http://schema.org/MedicalRiskCalculator",
      MedicalRiskEstimator: "http://schema.org/MedicalRiskEstimator",
      MedicalRiskFactor: "http://schema.org/MedicalRiskFactor",
      MedicalRiskScore: "http://schema.org/MedicalRiskScore",
      MedicalScholarlyArticle: "http://schema.org/MedicalScholarlyArticle",
      MedicalSign: "http://schema.org/MedicalSign",
      MedicalSignOrSymptom: "http://schema.org/MedicalSignOrSymptom",
      MedicalSpecialty: "http://schema.org/MedicalSpecialty",
      MedicalStudy: "http://schema.org/MedicalStudy",
      MedicalStudyStatus: "http://schema.org/MedicalStudyStatus",
      MedicalSymptom: "http://schema.org/MedicalSymptom",
      MedicalTest: "http://schema.org/MedicalTest",
      MedicalTestPanel: "http://schema.org/MedicalTestPanel",
      MedicalTherapy: "http://schema.org/MedicalTherapy",
      MedicalTrial: "http://schema.org/MedicalTrial",
      MedicalTrialDesign: "http://schema.org/MedicalTrialDesign",
      MedicalWebPage: "http://schema.org/MedicalWebPage",
      MedicineSystem: "http://schema.org/MedicineSystem",
      MeetingRoom: "http://schema.org/MeetingRoom",
      MensClothingStore: "http://schema.org/MensClothingStore",
      Menu: "http://schema.org/Menu",
      MenuItem: "http://schema.org/MenuItem",
      MenuSection: "http://schema.org/MenuSection",
      MerchantReturnEnumeration: "http://schema.org/MerchantReturnEnumeration",
      MerchantReturnFiniteReturnWindow: "http://schema.org/MerchantReturnFiniteReturnWindow",
      MerchantReturnNotPermitted: "http://schema.org/MerchantReturnNotPermitted",
      MerchantReturnPolicy: "http://schema.org/MerchantReturnPolicy",
      MerchantReturnUnlimitedWindow: "http://schema.org/MerchantReturnUnlimitedWindow",
      MerchantReturnUnspecified: "http://schema.org/MerchantReturnUnspecified",
      Message: "http://schema.org/Message",
      MiddleSchool: "http://schema.org/MiddleSchool",
      Midwifery: "http://schema.org/Midwifery",
      MisconceptionsHealthAspect: "http://schema.org/MisconceptionsHealthAspect",
      MissingContext: "http://schema.org/MissingContext",
      MixedEventAttendanceMode: "http://schema.org/MixedEventAttendanceMode",
      MixtapeAlbum: "http://schema.org/MixtapeAlbum",
      MobileApplication: "http://schema.org/MobileApplication",
      MobilePhoneStore: "http://schema.org/MobilePhoneStore",
      Monday: "http://schema.org/Monday",
      MonetaryAmount: "http://schema.org/MonetaryAmount",
      MonetaryAmountDistribution: "http://schema.org/MonetaryAmountDistribution",
      MonetaryGrant: "http://schema.org/MonetaryGrant",
      MoneyTransfer: "http://schema.org/MoneyTransfer",
      MortgageLoan: "http://schema.org/MortgageLoan",
      Mosque: "http://schema.org/Mosque",
      Motel: "http://schema.org/Motel",
      Motorcycle: "http://schema.org/Motorcycle",
      MotorcycleDealer: "http://schema.org/MotorcycleDealer",
      MotorcycleRepair: "http://schema.org/MotorcycleRepair",
      MotorizedBicycle: "http://schema.org/MotorizedBicycle",
      Mountain: "http://schema.org/Mountain",
      MoveAction: "http://schema.org/MoveAction",
      Movie: "http://schema.org/Movie",
      MovieClip: "http://schema.org/MovieClip",
      MovieRentalStore: "http://schema.org/MovieRentalStore",
      MovieSeries: "http://schema.org/MovieSeries",
      MovieTheater: "http://schema.org/MovieTheater",
      MovingCompany: "http://schema.org/MovingCompany",
      MultiCenterTrial: "http://schema.org/MultiCenterTrial",
      MultiPlayer: "http://schema.org/MultiPlayer",
      MulticellularParasite: "http://schema.org/MulticellularParasite",
      Muscle: "http://schema.org/Muscle",
      Musculoskeletal: "http://schema.org/Musculoskeletal",
      MusculoskeletalExam: "http://schema.org/MusculoskeletalExam",
      Museum: "http://schema.org/Museum",
      MusicAlbum: "http://schema.org/MusicAlbum",
      MusicAlbumProductionType: "http://schema.org/MusicAlbumProductionType",
      MusicAlbumReleaseType: "http://schema.org/MusicAlbumReleaseType",
      MusicComposition: "http://schema.org/MusicComposition",
      MusicEvent: "http://schema.org/MusicEvent",
      MusicGroup: "http://schema.org/MusicGroup",
      MusicPlaylist: "http://schema.org/MusicPlaylist",
      MusicRecording: "http://schema.org/MusicRecording",
      MusicRelease: "http://schema.org/MusicRelease",
      MusicReleaseFormatType: "http://schema.org/MusicReleaseFormatType",
      MusicStore: "http://schema.org/MusicStore",
      MusicVenue: "http://schema.org/MusicVenue",
      MusicVideoObject: "http://schema.org/MusicVideoObject",
      NGO: "http://schema.org/NGO",
      NLNonprofitType: "http://schema.org/NLNonprofitType",
      NailSalon: "http://schema.org/NailSalon",
      Neck: "http://schema.org/Neck",
      Nerve: "http://schema.org/Nerve",
      Neuro: "http://schema.org/Neuro",
      Neurologic: "http://schema.org/Neurologic",
      NewCondition: "http://schema.org/NewCondition",
      NewsArticle: "http://schema.org/NewsArticle",
      NewsMediaOrganization: "http://schema.org/NewsMediaOrganization",
      Newspaper: "http://schema.org/Newspaper",
      NightClub: "http://schema.org/NightClub",
      NoninvasiveProcedure: "http://schema.org/NoninvasiveProcedure",
      Nonprofit501a: "http://schema.org/Nonprofit501a",
      Nonprofit501c1: "http://schema.org/Nonprofit501c1",
      Nonprofit501c10: "http://schema.org/Nonprofit501c10",
      Nonprofit501c11: "http://schema.org/Nonprofit501c11",
      Nonprofit501c12: "http://schema.org/Nonprofit501c12",
      Nonprofit501c13: "http://schema.org/Nonprofit501c13",
      Nonprofit501c14: "http://schema.org/Nonprofit501c14",
      Nonprofit501c15: "http://schema.org/Nonprofit501c15",
      Nonprofit501c16: "http://schema.org/Nonprofit501c16",
      Nonprofit501c17: "http://schema.org/Nonprofit501c17",
      Nonprofit501c18: "http://schema.org/Nonprofit501c18",
      Nonprofit501c19: "http://schema.org/Nonprofit501c19",
      Nonprofit501c2: "http://schema.org/Nonprofit501c2",
      Nonprofit501c20: "http://schema.org/Nonprofit501c20",
      Nonprofit501c21: "http://schema.org/Nonprofit501c21",
      Nonprofit501c22: "http://schema.org/Nonprofit501c22",
      Nonprofit501c23: "http://schema.org/Nonprofit501c23",
      Nonprofit501c24: "http://schema.org/Nonprofit501c24",
      Nonprofit501c25: "http://schema.org/Nonprofit501c25",
      Nonprofit501c26: "http://schema.org/Nonprofit501c26",
      Nonprofit501c27: "http://schema.org/Nonprofit501c27",
      Nonprofit501c28: "http://schema.org/Nonprofit501c28",
      Nonprofit501c3: "http://schema.org/Nonprofit501c3",
      Nonprofit501c4: "http://schema.org/Nonprofit501c4",
      Nonprofit501c5: "http://schema.org/Nonprofit501c5",
      Nonprofit501c6: "http://schema.org/Nonprofit501c6",
      Nonprofit501c7: "http://schema.org/Nonprofit501c7",
      Nonprofit501c8: "http://schema.org/Nonprofit501c8",
      Nonprofit501c9: "http://schema.org/Nonprofit501c9",
      Nonprofit501d: "http://schema.org/Nonprofit501d",
      Nonprofit501e: "http://schema.org/Nonprofit501e",
      Nonprofit501f: "http://schema.org/Nonprofit501f",
      Nonprofit501k: "http://schema.org/Nonprofit501k",
      Nonprofit501n: "http://schema.org/Nonprofit501n",
      Nonprofit501q: "http://schema.org/Nonprofit501q",
      Nonprofit527: "http://schema.org/Nonprofit527",
      NonprofitANBI: "http://schema.org/NonprofitANBI",
      NonprofitSBBI: "http://schema.org/NonprofitSBBI",
      NonprofitType: "http://schema.org/NonprofitType",
      Nose: "http://schema.org/Nose",
      NotInForce: "http://schema.org/NotInForce",
      NotYetRecruiting: "http://schema.org/NotYetRecruiting",
      Notary: "http://schema.org/Notary",
      NoteDigitalDocument: "http://schema.org/NoteDigitalDocument",
      Number: "http://schema.org/Number",
      Nursing: "http://schema.org/Nursing",
      NutritionInformation: "http://schema.org/NutritionInformation",
      OTC: "http://schema.org/OTC",
      Observation: "http://schema.org/Observation",
      Observational: "http://schema.org/Observational",
      Obstetric: "http://schema.org/Obstetric",
      Occupation: "http://schema.org/Occupation",
      OccupationalActivity: "http://schema.org/OccupationalActivity",
      OccupationalTherapy: "http://schema.org/OccupationalTherapy",
      OceanBodyOfWater: "http://schema.org/OceanBodyOfWater",
      Offer: "http://schema.org/Offer",
      OfferCatalog: "http://schema.org/OfferCatalog",
      OfferForLease: "http://schema.org/OfferForLease",
      OfferForPurchase: "http://schema.org/OfferForPurchase",
      OfferItemCondition: "http://schema.org/OfferItemCondition",
      OfferShippingDetails: "http://schema.org/OfferShippingDetails",
      OfficeEquipmentStore: "http://schema.org/OfficeEquipmentStore",
      OfficialLegalValue: "http://schema.org/OfficialLegalValue",
      OfflineEventAttendanceMode: "http://schema.org/OfflineEventAttendanceMode",
      OfflinePermanently: "http://schema.org/OfflinePermanently",
      OfflineTemporarily: "http://schema.org/OfflineTemporarily",
      OnDemandEvent: "http://schema.org/OnDemandEvent",
      OnSitePickup: "http://schema.org/OnSitePickup",
      Oncologic: "http://schema.org/Oncologic",
      OneTimePayments: "http://schema.org/OneTimePayments",
      Online: "http://schema.org/Online",
      OnlineEventAttendanceMode: "http://schema.org/OnlineEventAttendanceMode",
      OnlineFull: "http://schema.org/OnlineFull",
      OnlineOnly: "http://schema.org/OnlineOnly",
      OpenTrial: "http://schema.org/OpenTrial",
      OpeningHoursSpecification: "http://schema.org/OpeningHoursSpecification",
      OpinionNewsArticle: "http://schema.org/OpinionNewsArticle",
      Optician: "http://schema.org/Optician",
      Optometric: "http://schema.org/Optometric",
      Order: "http://schema.org/Order",
      OrderAction: "http://schema.org/OrderAction",
      OrderCancelled: "http://schema.org/OrderCancelled",
      OrderDelivered: "http://schema.org/OrderDelivered",
      OrderInTransit: "http://schema.org/OrderInTransit",
      OrderItem: "http://schema.org/OrderItem",
      OrderPaymentDue: "http://schema.org/OrderPaymentDue",
      OrderPickupAvailable: "http://schema.org/OrderPickupAvailable",
      OrderProblem: "http://schema.org/OrderProblem",
      OrderProcessing: "http://schema.org/OrderProcessing",
      OrderReturned: "http://schema.org/OrderReturned",
      OrderStatus: "http://schema.org/OrderStatus",
      Organization: "http://schema.org/Organization",
      OrganizationRole: "http://schema.org/OrganizationRole",
      OrganizeAction: "http://schema.org/OrganizeAction",
      OriginalShippingFees: "http://schema.org/OriginalShippingFees",
      Osteopathic: "http://schema.org/Osteopathic",
      Otolaryngologic: "http://schema.org/Otolaryngologic",
      OutOfStock: "http://schema.org/OutOfStock",
      OutletStore: "http://schema.org/OutletStore",
      OverviewHealthAspect: "http://schema.org/OverviewHealthAspect",
      OwnershipInfo: "http://schema.org/OwnershipInfo",
      PET: "http://schema.org/PET",
      PaidLeave: "http://schema.org/PaidLeave",
      PaintAction: "http://schema.org/PaintAction",
      Painting: "http://schema.org/Painting",
      PalliativeProcedure: "http://schema.org/PalliativeProcedure",
      Paperback: "http://schema.org/Paperback",
      ParcelDelivery: "http://schema.org/ParcelDelivery",
      ParcelService: "http://schema.org/ParcelService",
      ParentAudience: "http://schema.org/ParentAudience",
      ParentalSupport: "http://schema.org/ParentalSupport",
      Park: "http://schema.org/Park",
      ParkingFacility: "http://schema.org/ParkingFacility",
      ParkingMap: "http://schema.org/ParkingMap",
      PartiallyInForce: "http://schema.org/PartiallyInForce",
      Pathology: "http://schema.org/Pathology",
      PathologyTest: "http://schema.org/PathologyTest",
      Patient: "http://schema.org/Patient",
      PatientExperienceHealthAspect: "http://schema.org/PatientExperienceHealthAspect",
      PawnShop: "http://schema.org/PawnShop",
      PayAction: "http://schema.org/PayAction",
      PaymentAutomaticallyApplied: "http://schema.org/PaymentAutomaticallyApplied",
      PaymentCard: "http://schema.org/PaymentCard",
      PaymentChargeSpecification: "http://schema.org/PaymentChargeSpecification",
      PaymentComplete: "http://schema.org/PaymentComplete",
      PaymentDeclined: "http://schema.org/PaymentDeclined",
      PaymentDue: "http://schema.org/PaymentDue",
      PaymentMethod: "http://schema.org/PaymentMethod",
      PaymentPastDue: "http://schema.org/PaymentPastDue",
      PaymentService: "http://schema.org/PaymentService",
      PaymentStatusType: "http://schema.org/PaymentStatusType",
      Pediatric: "http://schema.org/Pediatric",
      PeopleAudience: "http://schema.org/PeopleAudience",
      PercutaneousProcedure: "http://schema.org/PercutaneousProcedure",
      PerformAction: "http://schema.org/PerformAction",
      PerformanceRole: "http://schema.org/PerformanceRole",
      PerformingArtsTheater: "http://schema.org/PerformingArtsTheater",
      PerformingGroup: "http://schema.org/PerformingGroup",
      Periodical: "http://schema.org/Periodical",
      Permit: "http://schema.org/Permit",
      Person: "http://schema.org/Person",
      PetStore: "http://schema.org/PetStore",
      Pharmacy: "http://schema.org/Pharmacy",
      PharmacySpecialty: "http://schema.org/PharmacySpecialty",
      Photograph: "http://schema.org/Photograph",
      PhotographAction: "http://schema.org/PhotographAction",
      PhysicalActivity: "http://schema.org/PhysicalActivity",
      PhysicalActivityCategory: "http://schema.org/PhysicalActivityCategory",
      PhysicalExam: "http://schema.org/PhysicalExam",
      PhysicalTherapy: "http://schema.org/PhysicalTherapy",
      Physician: "http://schema.org/Physician",
      Physiotherapy: "http://schema.org/Physiotherapy",
      Place: "http://schema.org/Place",
      PlaceOfWorship: "http://schema.org/PlaceOfWorship",
      PlaceboControlledTrial: "http://schema.org/PlaceboControlledTrial",
      PlanAction: "http://schema.org/PlanAction",
      PlasticSurgery: "http://schema.org/PlasticSurgery",
      Play: "http://schema.org/Play",
      PlayAction: "http://schema.org/PlayAction",
      Playground: "http://schema.org/Playground",
      Plumber: "http://schema.org/Plumber",
      PodcastEpisode: "http://schema.org/PodcastEpisode",
      PodcastSeason: "http://schema.org/PodcastSeason",
      PodcastSeries: "http://schema.org/PodcastSeries",
      Podiatric: "http://schema.org/Podiatric",
      PoliceStation: "http://schema.org/PoliceStation",
      Pond: "http://schema.org/Pond",
      PostOffice: "http://schema.org/PostOffice",
      PostalAddress: "http://schema.org/PostalAddress",
      PostalCodeRangeSpecification: "http://schema.org/PostalCodeRangeSpecification",
      Poster: "http://schema.org/Poster",
      PotentialActionStatus: "http://schema.org/PotentialActionStatus",
      PreOrder: "http://schema.org/PreOrder",
      PreOrderAction: "http://schema.org/PreOrderAction",
      PreSale: "http://schema.org/PreSale",
      PrependAction: "http://schema.org/PrependAction",
      Preschool: "http://schema.org/Preschool",
      PrescriptionOnly: "http://schema.org/PrescriptionOnly",
      PresentationDigitalDocument: "http://schema.org/PresentationDigitalDocument",
      PreventionHealthAspect: "http://schema.org/PreventionHealthAspect",
      PreventionIndication: "http://schema.org/PreventionIndication",
      PriceSpecification: "http://schema.org/PriceSpecification",
      PrimaryCare: "http://schema.org/PrimaryCare",
      Prion: "http://schema.org/Prion",
      Product: "http://schema.org/Product",
      ProductCollection: "http://schema.org/ProductCollection",
      ProductGroup: "http://schema.org/ProductGroup",
      ProductModel: "http://schema.org/ProductModel",
      ProductReturnEnumeration: "http://schema.org/ProductReturnEnumeration",
      ProductReturnFiniteReturnWindow: "http://schema.org/ProductReturnFiniteReturnWindow",
      ProductReturnNotPermitted: "http://schema.org/ProductReturnNotPermitted",
      ProductReturnPolicy: "http://schema.org/ProductReturnPolicy",
      ProductReturnUnlimitedWindow: "http://schema.org/ProductReturnUnlimitedWindow",
      ProductReturnUnspecified: "http://schema.org/ProductReturnUnspecified",
      ProfessionalService: "http://schema.org/ProfessionalService",
      ProfilePage: "http://schema.org/ProfilePage",
      PrognosisHealthAspect: "http://schema.org/PrognosisHealthAspect",
      ProgramMembership: "http://schema.org/ProgramMembership",
      Project: "http://schema.org/Project",
      PronounceableText: "http://schema.org/PronounceableText",
      Property: "http://schema.org/Property",
      PropertyValue: "http://schema.org/PropertyValue",
      PropertyValueSpecification: "http://schema.org/PropertyValueSpecification",
      Protozoa: "http://schema.org/Protozoa",
      Psychiatric: "http://schema.org/Psychiatric",
      PsychologicalTreatment: "http://schema.org/PsychologicalTreatment",
      PublicHealth: "http://schema.org/PublicHealth",
      PublicHolidays: "http://schema.org/PublicHolidays",
      PublicSwimmingPool: "http://schema.org/PublicSwimmingPool",
      PublicToilet: "http://schema.org/PublicToilet",
      PublicationEvent: "http://schema.org/PublicationEvent",
      PublicationIssue: "http://schema.org/PublicationIssue",
      PublicationVolume: "http://schema.org/PublicationVolume",
      Pulmonary: "http://schema.org/Pulmonary",
      QAPage: "http://schema.org/QAPage",
      QualitativeValue: "http://schema.org/QualitativeValue",
      QuantitativeValue: "http://schema.org/QuantitativeValue",
      QuantitativeValueDistribution: "http://schema.org/QuantitativeValueDistribution",
      Quantity: "http://schema.org/Quantity",
      Question: "http://schema.org/Question",
      Quiz: "http://schema.org/Quiz",
      Quotation: "http://schema.org/Quotation",
      QuoteAction: "http://schema.org/QuoteAction",
      RVPark: "http://schema.org/RVPark",
      RadiationTherapy: "http://schema.org/RadiationTherapy",
      RadioBroadcastService: "http://schema.org/RadioBroadcastService",
      RadioChannel: "http://schema.org/RadioChannel",
      RadioClip: "http://schema.org/RadioClip",
      RadioEpisode: "http://schema.org/RadioEpisode",
      RadioSeason: "http://schema.org/RadioSeason",
      RadioSeries: "http://schema.org/RadioSeries",
      RadioStation: "http://schema.org/RadioStation",
      Radiography: "http://schema.org/Radiography",
      RandomizedTrial: "http://schema.org/RandomizedTrial",
      Rating: "http://schema.org/Rating",
      ReactAction: "http://schema.org/ReactAction",
      ReadAction: "http://schema.org/ReadAction",
      ReadPermission: "http://schema.org/ReadPermission",
      RealEstateAgent: "http://schema.org/RealEstateAgent",
      RealEstateListing: "http://schema.org/RealEstateListing",
      RearWheelDriveConfiguration: "http://schema.org/RearWheelDriveConfiguration",
      ReceiveAction: "http://schema.org/ReceiveAction",
      Recipe: "http://schema.org/Recipe",
      Recommendation: "http://schema.org/Recommendation",
      RecommendedDoseSchedule: "http://schema.org/RecommendedDoseSchedule",
      Recruiting: "http://schema.org/Recruiting",
      RecyclingCenter: "http://schema.org/RecyclingCenter",
      RefundTypeEnumeration: "http://schema.org/RefundTypeEnumeration",
      RefurbishedCondition: "http://schema.org/RefurbishedCondition",
      RegisterAction: "http://schema.org/RegisterAction",
      Registry: "http://schema.org/Registry",
      ReimbursementCap: "http://schema.org/ReimbursementCap",
      RejectAction: "http://schema.org/RejectAction",
      RelatedTopicsHealthAspect: "http://schema.org/RelatedTopicsHealthAspect",
      RemixAlbum: "http://schema.org/RemixAlbum",
      Renal: "http://schema.org/Renal",
      RentAction: "http://schema.org/RentAction",
      RentalCarReservation: "http://schema.org/RentalCarReservation",
      RentalVehicleUsage: "http://schema.org/RentalVehicleUsage",
      RepaymentSpecification: "http://schema.org/RepaymentSpecification",
      ReplaceAction: "http://schema.org/ReplaceAction",
      ReplyAction: "http://schema.org/ReplyAction",
      Report: "http://schema.org/Report",
      ReportageNewsArticle: "http://schema.org/ReportageNewsArticle",
      ReportedDoseSchedule: "http://schema.org/ReportedDoseSchedule",
      ResearchProject: "http://schema.org/ResearchProject",
      Researcher: "http://schema.org/Researcher",
      Reservation: "http://schema.org/Reservation",
      ReservationCancelled: "http://schema.org/ReservationCancelled",
      ReservationConfirmed: "http://schema.org/ReservationConfirmed",
      ReservationHold: "http://schema.org/ReservationHold",
      ReservationPackage: "http://schema.org/ReservationPackage",
      ReservationPending: "http://schema.org/ReservationPending",
      ReservationStatusType: "http://schema.org/ReservationStatusType",
      ReserveAction: "http://schema.org/ReserveAction",
      Reservoir: "http://schema.org/Reservoir",
      Residence: "http://schema.org/Residence",
      Resort: "http://schema.org/Resort",
      RespiratoryTherapy: "http://schema.org/RespiratoryTherapy",
      Restaurant: "http://schema.org/Restaurant",
      RestockingFees: "http://schema.org/RestockingFees",
      RestrictedDiet: "http://schema.org/RestrictedDiet",
      ResultsAvailable: "http://schema.org/ResultsAvailable",
      ResultsNotAvailable: "http://schema.org/ResultsNotAvailable",
      ResumeAction: "http://schema.org/ResumeAction",
      Retail: "http://schema.org/Retail",
      ReturnAction: "http://schema.org/ReturnAction",
      ReturnFeesEnumeration: "http://schema.org/ReturnFeesEnumeration",
      ReturnShippingFees: "http://schema.org/ReturnShippingFees",
      Review: "http://schema.org/Review",
      ReviewAction: "http://schema.org/ReviewAction",
      ReviewNewsArticle: "http://schema.org/ReviewNewsArticle",
      Rheumatologic: "http://schema.org/Rheumatologic",
      RightHandDriving: "http://schema.org/RightHandDriving",
      RisksOrComplicationsHealthAspect: "http://schema.org/RisksOrComplicationsHealthAspect",
      RiverBodyOfWater: "http://schema.org/RiverBodyOfWater",
      Role: "http://schema.org/Role",
      RoofingContractor: "http://schema.org/RoofingContractor",
      Room: "http://schema.org/Room",
      RsvpAction: "http://schema.org/RsvpAction",
      RsvpResponseMaybe: "http://schema.org/RsvpResponseMaybe",
      RsvpResponseNo: "http://schema.org/RsvpResponseNo",
      RsvpResponseType: "http://schema.org/RsvpResponseType",
      RsvpResponseYes: "http://schema.org/RsvpResponseYes",
      SaleEvent: "http://schema.org/SaleEvent",
      SatiricalArticle: "http://schema.org/SatiricalArticle",
      Saturday: "http://schema.org/Saturday",
      Schedule: "http://schema.org/Schedule",
      ScheduleAction: "http://schema.org/ScheduleAction",
      ScholarlyArticle: "http://schema.org/ScholarlyArticle",
      School: "http://schema.org/School",
      SchoolDistrict: "http://schema.org/SchoolDistrict",
      ScreeningEvent: "http://schema.org/ScreeningEvent",
      ScreeningHealthAspect: "http://schema.org/ScreeningHealthAspect",
      Sculpture: "http://schema.org/Sculpture",
      SeaBodyOfWater: "http://schema.org/SeaBodyOfWater",
      SearchAction: "http://schema.org/SearchAction",
      SearchResultsPage: "http://schema.org/SearchResultsPage",
      Season: "http://schema.org/Season",
      Seat: "http://schema.org/Seat",
      SeatingMap: "http://schema.org/SeatingMap",
      SeeDoctorHealthAspect: "http://schema.org/SeeDoctorHealthAspect",
      SelfCareHealthAspect: "http://schema.org/SelfCareHealthAspect",
      SelfStorage: "http://schema.org/SelfStorage",
      SellAction: "http://schema.org/SellAction",
      SendAction: "http://schema.org/SendAction",
      Series: "http://schema.org/Series",
      Service: "http://schema.org/Service",
      ServiceChannel: "http://schema.org/ServiceChannel",
      ShareAction: "http://schema.org/ShareAction",
      SheetMusic: "http://schema.org/SheetMusic",
      ShippingDeliveryTime: "http://schema.org/ShippingDeliveryTime",
      ShippingRateSettings: "http://schema.org/ShippingRateSettings",
      ShoeStore: "http://schema.org/ShoeStore",
      ShoppingCenter: "http://schema.org/ShoppingCenter",
      ShortStory: "http://schema.org/ShortStory",
      SideEffectsHealthAspect: "http://schema.org/SideEffectsHealthAspect",
      SingleBlindedTrial: "http://schema.org/SingleBlindedTrial",
      SingleCenterTrial: "http://schema.org/SingleCenterTrial",
      SingleFamilyResidence: "http://schema.org/SingleFamilyResidence",
      SinglePlayer: "http://schema.org/SinglePlayer",
      SingleRelease: "http://schema.org/SingleRelease",
      SiteNavigationElement: "http://schema.org/SiteNavigationElement",
      SkiResort: "http://schema.org/SkiResort",
      Skin: "http://schema.org/Skin",
      SocialEvent: "http://schema.org/SocialEvent",
      SocialMediaPosting: "http://schema.org/SocialMediaPosting",
      SoftwareApplication: "http://schema.org/SoftwareApplication",
      SoftwareSourceCode: "http://schema.org/SoftwareSourceCode",
      SoldOut: "http://schema.org/SoldOut",
      SomeProducts: "http://schema.org/SomeProducts",
      SoundtrackAlbum: "http://schema.org/SoundtrackAlbum",
      SpeakableSpecification: "http://schema.org/SpeakableSpecification",
      SpecialAnnouncement: "http://schema.org/SpecialAnnouncement",
      Specialty: "http://schema.org/Specialty",
      SpeechPathology: "http://schema.org/SpeechPathology",
      SpokenWordAlbum: "http://schema.org/SpokenWordAlbum",
      SportingGoodsStore: "http://schema.org/SportingGoodsStore",
      SportsActivityLocation: "http://schema.org/SportsActivityLocation",
      SportsClub: "http://schema.org/SportsClub",
      SportsEvent: "http://schema.org/SportsEvent",
      SportsOrganization: "http://schema.org/SportsOrganization",
      SportsTeam: "http://schema.org/SportsTeam",
      SpreadsheetDigitalDocument: "http://schema.org/SpreadsheetDigitalDocument",
      StadiumOrArena: "http://schema.org/StadiumOrArena",
      StagesHealthAspect: "http://schema.org/StagesHealthAspect",
      State: "http://schema.org/State",
      StatisticalPopulation: "http://schema.org/StatisticalPopulation",
      StatusEnumeration: "http://schema.org/StatusEnumeration",
      SteeringPositionValue: "http://schema.org/SteeringPositionValue",
      Store: "http://schema.org/Store",
      StoreCreditRefund: "http://schema.org/StoreCreditRefund",
      StrengthTraining: "http://schema.org/StrengthTraining",
      StructuredValue: "http://schema.org/StructuredValue",
      StudioAlbum: "http://schema.org/StudioAlbum",
      StupidType: "http://schema.org/StupidType",
      SubscribeAction: "http://schema.org/SubscribeAction",
      Substance: "http://schema.org/Substance",
      SubwayStation: "http://schema.org/SubwayStation",
      Suite: "http://schema.org/Suite",
      Sunday: "http://schema.org/Sunday",
      SuperficialAnatomy: "http://schema.org/SuperficialAnatomy",
      Surgical: "http://schema.org/Surgical",
      SurgicalProcedure: "http://schema.org/SurgicalProcedure",
      SuspendAction: "http://schema.org/SuspendAction",
      Suspended: "http://schema.org/Suspended",
      SymptomsHealthAspect: "http://schema.org/SymptomsHealthAspect",
      Synagogue: "http://schema.org/Synagogue",
      TVClip: "http://schema.org/TVClip",
      TVEpisode: "http://schema.org/TVEpisode",
      TVSeason: "http://schema.org/TVSeason",
      TVSeries: "http://schema.org/TVSeries",
      Table: "http://schema.org/Table",
      TakeAction: "http://schema.org/TakeAction",
      TattooParlor: "http://schema.org/TattooParlor",
      Taxi: "http://schema.org/Taxi",
      TaxiReservation: "http://schema.org/TaxiReservation",
      TaxiService: "http://schema.org/TaxiService",
      TaxiStand: "http://schema.org/TaxiStand",
      TaxiVehicleUsage: "http://schema.org/TaxiVehicleUsage",
      TechArticle: "http://schema.org/TechArticle",
      TelevisionChannel: "http://schema.org/TelevisionChannel",
      TelevisionStation: "http://schema.org/TelevisionStation",
      TennisComplex: "http://schema.org/TennisComplex",
      Terminated: "http://schema.org/Terminated",
      Text: "http://schema.org/Text",
      TextDigitalDocument: "http://schema.org/TextDigitalDocument",
      TheaterEvent: "http://schema.org/TheaterEvent",
      TheaterGroup: "http://schema.org/TheaterGroup",
      Therapeutic: "http://schema.org/Therapeutic",
      TherapeuticProcedure: "http://schema.org/TherapeuticProcedure",
      Thesis: "http://schema.org/Thesis",
      Thing: "http://schema.org/Thing",
      Throat: "http://schema.org/Throat",
      Thursday: "http://schema.org/Thursday",
      Ticket: "http://schema.org/Ticket",
      TieAction: "http://schema.org/TieAction",
      Time: "http://schema.org/Time",
      TipAction: "http://schema.org/TipAction",
      TireShop: "http://schema.org/TireShop",
      TollFree: "http://schema.org/TollFree",
      TouristAttraction: "http://schema.org/TouristAttraction",
      TouristDestination: "http://schema.org/TouristDestination",
      TouristInformationCenter: "http://schema.org/TouristInformationCenter",
      TouristTrip: "http://schema.org/TouristTrip",
      Toxicologic: "http://schema.org/Toxicologic",
      ToyStore: "http://schema.org/ToyStore",
      TrackAction: "http://schema.org/TrackAction",
      TradeAction: "http://schema.org/TradeAction",
      TraditionalChinese: "http://schema.org/TraditionalChinese",
      TrainReservation: "http://schema.org/TrainReservation",
      TrainStation: "http://schema.org/TrainStation",
      TrainTrip: "http://schema.org/TrainTrip",
      TransferAction: "http://schema.org/TransferAction",
      TransitMap: "http://schema.org/TransitMap",
      TravelAction: "http://schema.org/TravelAction",
      TravelAgency: "http://schema.org/TravelAgency",
      TreatmentIndication: "http://schema.org/TreatmentIndication",
      TreatmentsHealthAspect: "http://schema.org/TreatmentsHealthAspect",
      Trip: "http://schema.org/Trip",
      TripleBlindedTrial: "http://schema.org/TripleBlindedTrial",
      True: "http://schema.org/True",
      Tuesday: "http://schema.org/Tuesday",
      TypeAndQuantityNode: "http://schema.org/TypeAndQuantityNode",
      TypesHealthAspect: "http://schema.org/TypesHealthAspect",
      UKNonprofitType: "http://schema.org/UKNonprofitType",
      UKTrust: "http://schema.org/UKTrust",
      URL: "http://schema.org/URL",
      USNonprofitType: "http://schema.org/USNonprofitType",
      Ultrasound: "http://schema.org/Ultrasound",
      UnRegisterAction: "http://schema.org/UnRegisterAction",
      UnemploymentSupport: "http://schema.org/UnemploymentSupport",
      UnincorporatedAssociationCharity: "http://schema.org/UnincorporatedAssociationCharity",
      UnitPriceSpecification: "http://schema.org/UnitPriceSpecification",
      UnofficialLegalValue: "http://schema.org/UnofficialLegalValue",
      UpdateAction: "http://schema.org/UpdateAction",
      Urologic: "http://schema.org/Urologic",
      UsageOrScheduleHealthAspect: "http://schema.org/UsageOrScheduleHealthAspect",
      UseAction: "http://schema.org/UseAction",
      UsedCondition: "http://schema.org/UsedCondition",
      UserBlocks: "http://schema.org/UserBlocks",
      UserCheckins: "http://schema.org/UserCheckins",
      UserComments: "http://schema.org/UserComments",
      UserDownloads: "http://schema.org/UserDownloads",
      UserInteraction: "http://schema.org/UserInteraction",
      UserLikes: "http://schema.org/UserLikes",
      UserPageVisits: "http://schema.org/UserPageVisits",
      UserPlays: "http://schema.org/UserPlays",
      UserPlusOnes: "http://schema.org/UserPlusOnes",
      UserReview: "http://schema.org/UserReview",
      UserTweets: "http://schema.org/UserTweets",
      VeganDiet: "http://schema.org/VeganDiet",
      VegetarianDiet: "http://schema.org/VegetarianDiet",
      Vehicle: "http://schema.org/Vehicle",
      Vein: "http://schema.org/Vein",
      VenueMap: "http://schema.org/VenueMap",
      Vessel: "http://schema.org/Vessel",
      VeterinaryCare: "http://schema.org/VeterinaryCare",
      VideoGallery: "http://schema.org/VideoGallery",
      VideoGame: "http://schema.org/VideoGame",
      VideoGameClip: "http://schema.org/VideoGameClip",
      VideoGameSeries: "http://schema.org/VideoGameSeries",
      VideoObject: "http://schema.org/VideoObject",
      ViewAction: "http://schema.org/ViewAction",
      VinylFormat: "http://schema.org/VinylFormat",
      VirtualLocation: "http://schema.org/VirtualLocation",
      Virus: "http://schema.org/Virus",
      VisualArtsEvent: "http://schema.org/VisualArtsEvent",
      VisualArtwork: "http://schema.org/VisualArtwork",
      VitalSign: "http://schema.org/VitalSign",
      Volcano: "http://schema.org/Volcano",
      VoteAction: "http://schema.org/VoteAction",
      WPAdBlock: "http://schema.org/WPAdBlock",
      WPFooter: "http://schema.org/WPFooter",
      WPHeader: "http://schema.org/WPHeader",
      WPSideBar: "http://schema.org/WPSideBar",
      WantAction: "http://schema.org/WantAction",
      WarrantyPromise: "http://schema.org/WarrantyPromise",
      WarrantyScope: "http://schema.org/WarrantyScope",
      WatchAction: "http://schema.org/WatchAction",
      Waterfall: "http://schema.org/Waterfall",
      WearAction: "http://schema.org/WearAction",
      WebAPI: "http://schema.org/WebAPI",
      WebApplication: "http://schema.org/WebApplication",
      WebContent: "http://schema.org/WebContent",
      WebPage: "http://schema.org/WebPage",
      WebPageElement: "http://schema.org/WebPageElement",
      WebSite: "http://schema.org/WebSite",
      Wednesday: "http://schema.org/Wednesday",
      WesternConventional: "http://schema.org/WesternConventional",
      Wholesale: "http://schema.org/Wholesale",
      WholesaleStore: "http://schema.org/WholesaleStore",
      WinAction: "http://schema.org/WinAction",
      Winery: "http://schema.org/Winery",
      Withdrawn: "http://schema.org/Withdrawn",
      WorkBasedProgram: "http://schema.org/WorkBasedProgram",
      WorkersUnion: "http://schema.org/WorkersUnion",
      WriteAction: "http://schema.org/WriteAction",
      WritePermission: "http://schema.org/WritePermission",
      XPathType: "http://schema.org/XPathType",
      XRay: "http://schema.org/XRay",
      ZoneBoardingPolicy: "http://schema.org/ZoneBoardingPolicy",
      Zoo: "http://schema.org/Zoo",
      about: "http://schema.org/about",
      abridged: "http://schema.org/abridged",
      abstract: "http://schema.org/abstract",
      accelerationTime: "http://schema.org/accelerationTime",
      acceptedAnswer: "http://schema.org/acceptedAnswer",
      acceptedOffer: "http://schema.org/acceptedOffer",
      acceptedPaymentMethod: "http://schema.org/acceptedPaymentMethod",
      acceptsReservations: "http://schema.org/acceptsReservations",
      accessCode: "http://schema.org/accessCode",
      accessMode: "http://schema.org/accessMode",
      accessModeSufficient: "http://schema.org/accessModeSufficient",
      accessibilityAPI: "http://schema.org/accessibilityAPI",
      accessibilityControl: "http://schema.org/accessibilityControl",
      accessibilityFeature: "http://schema.org/accessibilityFeature",
      accessibilityHazard: "http://schema.org/accessibilityHazard",
      accessibilitySummary: "http://schema.org/accessibilitySummary",
      accommodationCategory: "http://schema.org/accommodationCategory",
      accommodationFloorPlan: "http://schema.org/accommodationFloorPlan",
      accountId: "http://schema.org/accountId",
      accountMinimumInflow: "http://schema.org/accountMinimumInflow",
      accountOverdraftLimit: "http://schema.org/accountOverdraftLimit",
      accountablePerson: "http://schema.org/accountablePerson",
      acquireLicensePage: "http://schema.org/acquireLicensePage",
      acquiredFrom: "http://schema.org/acquiredFrom",
      acrissCode: "http://schema.org/acrissCode",
      actionAccessibilityRequirement: "http://schema.org/actionAccessibilityRequirement",
      actionApplication: "http://schema.org/actionApplication",
      actionOption: "http://schema.org/actionOption",
      actionPlatform: "http://schema.org/actionPlatform",
      actionStatus: "http://schema.org/actionStatus",
      actionableFeedbackPolicy: "http://schema.org/actionableFeedbackPolicy",
      activeIngredient: "http://schema.org/activeIngredient",
      activityDuration: "http://schema.org/activityDuration",
      activityFrequency: "http://schema.org/activityFrequency",
      actor: "http://schema.org/actor",
      actors: "http://schema.org/actors",
      addOn: "http://schema.org/addOn",
      additionalName: "http://schema.org/additionalName",
      additionalNumberOfGuests: "http://schema.org/additionalNumberOfGuests",
      additionalProperty: "http://schema.org/additionalProperty",
      additionalType: "http://schema.org/additionalType",
      additionalVariable: "http://schema.org/additionalVariable",
      address: "http://schema.org/address",
      addressCountry: "http://schema.org/addressCountry",
      addressLocality: "http://schema.org/addressLocality",
      addressRegion: "http://schema.org/addressRegion",
      administrationRoute: "http://schema.org/administrationRoute",
      advanceBookingRequirement: "http://schema.org/advanceBookingRequirement",
      adverseOutcome: "http://schema.org/adverseOutcome",
      affectedBy: "http://schema.org/affectedBy",
      affiliation: "http://schema.org/affiliation",
      afterMedia: "http://schema.org/afterMedia",
      agent: "http://schema.org/agent",
      aggregateRating: "http://schema.org/aggregateRating",
      aircraft: "http://schema.org/aircraft",
      album: "http://schema.org/album",
      albumProductionType: "http://schema.org/albumProductionType",
      albumRelease: "http://schema.org/albumRelease",
      albumReleaseType: "http://schema.org/albumReleaseType",
      albums: "http://schema.org/albums",
      alcoholWarning: "http://schema.org/alcoholWarning",
      algorithm: "http://schema.org/algorithm",
      alignmentType: "http://schema.org/alignmentType",
      alternateName: "http://schema.org/alternateName",
      alternativeHeadline: "http://schema.org/alternativeHeadline",
      alumni: "http://schema.org/alumni",
      alumniOf: "http://schema.org/alumniOf",
      amenityFeature: "http://schema.org/amenityFeature",
      amount: "http://schema.org/amount",
      amountOfThisGood: "http://schema.org/amountOfThisGood",
      announcementLocation: "http://schema.org/announcementLocation",
      annualPercentageRate: "http://schema.org/annualPercentageRate",
      answerCount: "http://schema.org/answerCount",
      answerExplanation: "http://schema.org/answerExplanation",
      antagonist: "http://schema.org/antagonist",
      appearance: "http://schema.org/appearance",
      applicableLocation: "http://schema.org/applicableLocation",
      applicantLocationRequirements: "http://schema.org/applicantLocationRequirements",
      application: "http://schema.org/application",
      applicationCategory: "http://schema.org/applicationCategory",
      applicationContact: "http://schema.org/applicationContact",
      applicationDeadline: "http://schema.org/applicationDeadline",
      applicationStartDate: "http://schema.org/applicationStartDate",
      applicationSubCategory: "http://schema.org/applicationSubCategory",
      applicationSuite: "http://schema.org/applicationSuite",
      appliesToDeliveryMethod: "http://schema.org/appliesToDeliveryMethod",
      appliesToPaymentMethod: "http://schema.org/appliesToPaymentMethod",
      archiveHeld: "http://schema.org/archiveHeld",
      area: "http://schema.org/area",
      areaServed: "http://schema.org/areaServed",
      arrivalAirport: "http://schema.org/arrivalAirport",
      arrivalBoatTerminal: "http://schema.org/arrivalBoatTerminal",
      arrivalBusStop: "http://schema.org/arrivalBusStop",
      arrivalGate: "http://schema.org/arrivalGate",
      arrivalPlatform: "http://schema.org/arrivalPlatform",
      arrivalStation: "http://schema.org/arrivalStation",
      arrivalTerminal: "http://schema.org/arrivalTerminal",
      arrivalTime: "http://schema.org/arrivalTime",
      artEdition: "http://schema.org/artEdition",
      artMedium: "http://schema.org/artMedium",
      arterialBranch: "http://schema.org/arterialBranch",
      artform: "http://schema.org/artform",
      articleBody: "http://schema.org/articleBody",
      articleSection: "http://schema.org/articleSection",
      artist: "http://schema.org/artist",
      artworkSurface: "http://schema.org/artworkSurface",
      aspect: "http://schema.org/aspect",
      assembly: "http://schema.org/assembly",
      assemblyVersion: "http://schema.org/assemblyVersion",
      assesses: "http://schema.org/assesses",
      associatedAnatomy: "http://schema.org/associatedAnatomy",
      associatedArticle: "http://schema.org/associatedArticle",
      associatedMedia: "http://schema.org/associatedMedia",
      associatedPathophysiology: "http://schema.org/associatedPathophysiology",
      athlete: "http://schema.org/athlete",
      attendee: "http://schema.org/attendee",
      attendees: "http://schema.org/attendees",
      audience: "http://schema.org/audience",
      audienceType: "http://schema.org/audienceType",
      audio: "http://schema.org/audio",
      authenticator: "http://schema.org/authenticator",
      author: "http://schema.org/author",
      availability: "http://schema.org/availability",
      availabilityEnds: "http://schema.org/availabilityEnds",
      availabilityStarts: "http://schema.org/availabilityStarts",
      availableAtOrFrom: "http://schema.org/availableAtOrFrom",
      availableChannel: "http://schema.org/availableChannel",
      availableDeliveryMethod: "http://schema.org/availableDeliveryMethod",
      availableFrom: "http://schema.org/availableFrom",
      availableIn: "http://schema.org/availableIn",
      availableLanguage: "http://schema.org/availableLanguage",
      availableOnDevice: "http://schema.org/availableOnDevice",
      availableService: "http://schema.org/availableService",
      availableStrength: "http://schema.org/availableStrength",
      availableTest: "http://schema.org/availableTest",
      availableThrough: "http://schema.org/availableThrough",
      award: "http://schema.org/award",
      awards: "http://schema.org/awards",
      awayTeam: "http://schema.org/awayTeam",
      backstory: "http://schema.org/backstory",
      bankAccountType: "http://schema.org/bankAccountType",
      baseSalary: "http://schema.org/baseSalary",
      bccRecipient: "http://schema.org/bccRecipient",
      bed: "http://schema.org/bed",
      beforeMedia: "http://schema.org/beforeMedia",
      beneficiaryBank: "http://schema.org/beneficiaryBank",
      benefits: "http://schema.org/benefits",
      benefitsSummaryUrl: "http://schema.org/benefitsSummaryUrl",
      bestRating: "http://schema.org/bestRating",
      billingAddress: "http://schema.org/billingAddress",
      billingIncrement: "http://schema.org/billingIncrement",
      billingPeriod: "http://schema.org/billingPeriod",
      biomechnicalClass: "http://schema.org/biomechnicalClass",
      birthDate: "http://schema.org/birthDate",
      birthPlace: "http://schema.org/birthPlace",
      bitrate: "http://schema.org/bitrate",
      blogPost: "http://schema.org/blogPost",
      blogPosts: "http://schema.org/blogPosts",
      bloodSupply: "http://schema.org/bloodSupply",
      boardingGroup: "http://schema.org/boardingGroup",
      boardingPolicy: "http://schema.org/boardingPolicy",
      bodyLocation: "http://schema.org/bodyLocation",
      bodyType: "http://schema.org/bodyType",
      bookEdition: "http://schema.org/bookEdition",
      bookFormat: "http://schema.org/bookFormat",
      bookingAgent: "http://schema.org/bookingAgent",
      bookingTime: "http://schema.org/bookingTime",
      borrower: "http://schema.org/borrower",
      box: "http://schema.org/box",
      branch: "http://schema.org/branch",
      branchCode: "http://schema.org/branchCode",
      branchOf: "http://schema.org/branchOf",
      brand: "http://schema.org/brand",
      breadcrumb: "http://schema.org/breadcrumb",
      breastfeedingWarning: "http://schema.org/breastfeedingWarning",
      broadcastAffiliateOf: "http://schema.org/broadcastAffiliateOf",
      broadcastChannelId: "http://schema.org/broadcastChannelId",
      broadcastDisplayName: "http://schema.org/broadcastDisplayName",
      broadcastFrequency: "http://schema.org/broadcastFrequency",
      broadcastFrequencyValue: "http://schema.org/broadcastFrequencyValue",
      broadcastOfEvent: "http://schema.org/broadcastOfEvent",
      broadcastServiceTier: "http://schema.org/broadcastServiceTier",
      broadcastSignalModulation: "http://schema.org/broadcastSignalModulation",
      broadcastSubChannel: "http://schema.org/broadcastSubChannel",
      broadcastTimezone: "http://schema.org/broadcastTimezone",
      broadcaster: "http://schema.org/broadcaster",
      broker: "http://schema.org/broker",
      browserRequirements: "http://schema.org/browserRequirements",
      busName: "http://schema.org/busName",
      busNumber: "http://schema.org/busNumber",
      businessDays: "http://schema.org/businessDays",
      businessFunction: "http://schema.org/businessFunction",
      buyer: "http://schema.org/buyer",
      byArtist: "http://schema.org/byArtist",
      byDay: "http://schema.org/byDay",
      byMonth: "http://schema.org/byMonth",
      byMonthDay: "http://schema.org/byMonthDay",
      byMonthWeek: "http://schema.org/byMonthWeek",
      callSign: "http://schema.org/callSign",
      calories: "http://schema.org/calories",
      candidate: "http://schema.org/candidate",
      caption: "http://schema.org/caption",
      carbohydrateContent: "http://schema.org/carbohydrateContent",
      cargoVolume: "http://schema.org/cargoVolume",
      carrier: "http://schema.org/carrier",
      carrierRequirements: "http://schema.org/carrierRequirements",
      cashBack: "http://schema.org/cashBack",
      catalog: "http://schema.org/catalog",
      catalogNumber: "http://schema.org/catalogNumber",
      category: "http://schema.org/category",
      causeOf: "http://schema.org/causeOf",
      ccRecipient: "http://schema.org/ccRecipient",
      character: "http://schema.org/character",
      characterAttribute: "http://schema.org/characterAttribute",
      characterName: "http://schema.org/characterName",
      cheatCode: "http://schema.org/cheatCode",
      checkinTime: "http://schema.org/checkinTime",
      checkoutTime: "http://schema.org/checkoutTime",
      childMaxAge: "http://schema.org/childMaxAge",
      childMinAge: "http://schema.org/childMinAge",
      children: "http://schema.org/children",
      cholesterolContent: "http://schema.org/cholesterolContent",
      circle: "http://schema.org/circle",
      citation: "http://schema.org/citation",
      claimReviewed: "http://schema.org/claimReviewed",
      clincalPharmacology: "http://schema.org/clincalPharmacology",
      clinicalPharmacology: "http://schema.org/clinicalPharmacology",
      clipNumber: "http://schema.org/clipNumber",
      closes: "http://schema.org/closes",
      coach: "http://schema.org/coach",
      code: "http://schema.org/code",
      codeRepository: "http://schema.org/codeRepository",
      codeSampleType: "http://schema.org/codeSampleType",
      codeValue: "http://schema.org/codeValue",
      codingSystem: "http://schema.org/codingSystem",
      colleague: "http://schema.org/colleague",
      colleagues: "http://schema.org/colleagues",
      collection: "http://schema.org/collection",
      collectionSize: "http://schema.org/collectionSize",
      color: "http://schema.org/color",
      colorist: "http://schema.org/colorist",
      comment: "http://schema.org/comment",
      commentCount: "http://schema.org/commentCount",
      commentText: "http://schema.org/commentText",
      commentTime: "http://schema.org/commentTime",
      competencyRequired: "http://schema.org/competencyRequired",
      competitor: "http://schema.org/competitor",
      composer: "http://schema.org/composer",
      comprisedOf: "http://schema.org/comprisedOf",
      conditionsOfAccess: "http://schema.org/conditionsOfAccess",
      confirmationNumber: "http://schema.org/confirmationNumber",
      connectedTo: "http://schema.org/connectedTo",
      constrainingProperty: "http://schema.org/constrainingProperty",
      contactOption: "http://schema.org/contactOption",
      contactPoint: "http://schema.org/contactPoint",
      contactPoints: "http://schema.org/contactPoints",
      contactType: "http://schema.org/contactType",
      contactlessPayment: "http://schema.org/contactlessPayment",
      containedIn: "http://schema.org/containedIn",
      containedInPlace: "http://schema.org/containedInPlace",
      containsPlace: "http://schema.org/containsPlace",
      containsSeason: "http://schema.org/containsSeason",
      contentLocation: "http://schema.org/contentLocation",
      contentRating: "http://schema.org/contentRating",
      contentReferenceTime: "http://schema.org/contentReferenceTime",
      contentSize: "http://schema.org/contentSize",
      contentType: "http://schema.org/contentType",
      contentUrl: "http://schema.org/contentUrl",
      contraindication: "http://schema.org/contraindication",
      contributor: "http://schema.org/contributor",
      cookTime: "http://schema.org/cookTime",
      cookingMethod: "http://schema.org/cookingMethod",
      copyrightHolder: "http://schema.org/copyrightHolder",
      copyrightYear: "http://schema.org/copyrightYear",
      correction: "http://schema.org/correction",
      correctionsPolicy: "http://schema.org/correctionsPolicy",
      costCategory: "http://schema.org/costCategory",
      costCurrency: "http://schema.org/costCurrency",
      costOrigin: "http://schema.org/costOrigin",
      costPerUnit: "http://schema.org/costPerUnit",
      countriesNotSupported: "http://schema.org/countriesNotSupported",
      countriesSupported: "http://schema.org/countriesSupported",
      countryOfOrigin: "http://schema.org/countryOfOrigin",
      course: "http://schema.org/course",
      courseCode: "http://schema.org/courseCode",
      courseMode: "http://schema.org/courseMode",
      coursePrerequisites: "http://schema.org/coursePrerequisites",
      courseWorkload: "http://schema.org/courseWorkload",
      coverageEndTime: "http://schema.org/coverageEndTime",
      coverageStartTime: "http://schema.org/coverageStartTime",
      creativeWorkStatus: "http://schema.org/creativeWorkStatus",
      creator: "http://schema.org/creator",
      credentialCategory: "http://schema.org/credentialCategory",
      creditedTo: "http://schema.org/creditedTo",
      cssSelector: "http://schema.org/cssSelector",
      currenciesAccepted: "http://schema.org/currenciesAccepted",
      currency: "http://schema.org/currency",
      currentExchangeRate: "http://schema.org/currentExchangeRate",
      customer: "http://schema.org/customer",
      cutoffTime: "http://schema.org/cutoffTime",
      cvdCollectionDate: "http://schema.org/cvdCollectionDate",
      cvdFacilityCounty: "http://schema.org/cvdFacilityCounty",
      cvdFacilityId: "http://schema.org/cvdFacilityId",
      cvdNumBeds: "http://schema.org/cvdNumBeds",
      cvdNumBedsOcc: "http://schema.org/cvdNumBedsOcc",
      cvdNumC19Died: "http://schema.org/cvdNumC19Died",
      cvdNumC19HOPats: "http://schema.org/cvdNumC19HOPats",
      cvdNumC19HospPats: "http://schema.org/cvdNumC19HospPats",
      cvdNumC19MechVentPats: "http://schema.org/cvdNumC19MechVentPats",
      cvdNumC19OFMechVentPats: "http://schema.org/cvdNumC19OFMechVentPats",
      cvdNumC19OverflowPats: "http://schema.org/cvdNumC19OverflowPats",
      cvdNumICUBeds: "http://schema.org/cvdNumICUBeds",
      cvdNumICUBedsOcc: "http://schema.org/cvdNumICUBedsOcc",
      cvdNumTotBeds: "http://schema.org/cvdNumTotBeds",
      cvdNumVent: "http://schema.org/cvdNumVent",
      cvdNumVentUse: "http://schema.org/cvdNumVentUse",
      dataFeedElement: "http://schema.org/dataFeedElement",
      dataset: "http://schema.org/dataset",
      datasetTimeInterval: "http://schema.org/datasetTimeInterval",
      dateCreated: "http://schema.org/dateCreated",
      dateDeleted: "http://schema.org/dateDeleted",
      dateIssued: "http://schema.org/dateIssued",
      dateModified: "http://schema.org/dateModified",
      datePosted: "http://schema.org/datePosted",
      datePublished: "http://schema.org/datePublished",
      dateRead: "http://schema.org/dateRead",
      dateReceived: "http://schema.org/dateReceived",
      dateSent: "http://schema.org/dateSent",
      dateVehicleFirstRegistered: "http://schema.org/dateVehicleFirstRegistered",
      dateline: "http://schema.org/dateline",
      dayOfWeek: "http://schema.org/dayOfWeek",
      deathDate: "http://schema.org/deathDate",
      deathPlace: "http://schema.org/deathPlace",
      defaultValue: "http://schema.org/defaultValue",
      deliveryAddress: "http://schema.org/deliveryAddress",
      deliveryLeadTime: "http://schema.org/deliveryLeadTime",
      deliveryMethod: "http://schema.org/deliveryMethod",
      deliveryStatus: "http://schema.org/deliveryStatus",
      deliveryTime: "http://schema.org/deliveryTime",
      department: "http://schema.org/department",
      departureAirport: "http://schema.org/departureAirport",
      departureBoatTerminal: "http://schema.org/departureBoatTerminal",
      departureBusStop: "http://schema.org/departureBusStop",
      departureGate: "http://schema.org/departureGate",
      departurePlatform: "http://schema.org/departurePlatform",
      departureStation: "http://schema.org/departureStation",
      departureTerminal: "http://schema.org/departureTerminal",
      departureTime: "http://schema.org/departureTime",
      dependencies: "http://schema.org/dependencies",
      depth: "http://schema.org/depth",
      description: "http://schema.org/description",
      device: "http://schema.org/device",
      diagnosis: "http://schema.org/diagnosis",
      diagram: "http://schema.org/diagram",
      diet: "http://schema.org/diet",
      dietFeatures: "http://schema.org/dietFeatures",
      differentialDiagnosis: "http://schema.org/differentialDiagnosis",
      director: "http://schema.org/director",
      directors: "http://schema.org/directors",
      disambiguatingDescription: "http://schema.org/disambiguatingDescription",
      discount: "http://schema.org/discount",
      discountCode: "http://schema.org/discountCode",
      discountCurrency: "http://schema.org/discountCurrency",
      discusses: "http://schema.org/discusses",
      discussionUrl: "http://schema.org/discussionUrl",
      diseasePreventionInfo: "http://schema.org/diseasePreventionInfo",
      diseaseSpreadStatistics: "http://schema.org/diseaseSpreadStatistics",
      dissolutionDate: "http://schema.org/dissolutionDate",
      distance: "http://schema.org/distance",
      distinguishingSign: "http://schema.org/distinguishingSign",
      distribution: "http://schema.org/distribution",
      diversityPolicy: "http://schema.org/diversityPolicy",
      diversityStaffingReport: "http://schema.org/diversityStaffingReport",
      documentation: "http://schema.org/documentation",
      doesNotShip: "http://schema.org/doesNotShip",
      domainIncludes: "http://schema.org/domainIncludes",
      domiciledMortgage: "http://schema.org/domiciledMortgage",
      doorTime: "http://schema.org/doorTime",
      dosageForm: "http://schema.org/dosageForm",
      doseSchedule: "http://schema.org/doseSchedule",
      doseUnit: "http://schema.org/doseUnit",
      doseValue: "http://schema.org/doseValue",
      downPayment: "http://schema.org/downPayment",
      downloadUrl: "http://schema.org/downloadUrl",
      downvoteCount: "http://schema.org/downvoteCount",
      drainsTo: "http://schema.org/drainsTo",
      driveWheelConfiguration: "http://schema.org/driveWheelConfiguration",
      dropoffLocation: "http://schema.org/dropoffLocation",
      dropoffTime: "http://schema.org/dropoffTime",
      drug: "http://schema.org/drug",
      drugClass: "http://schema.org/drugClass",
      drugUnit: "http://schema.org/drugUnit",
      duns: "http://schema.org/duns",
      duplicateTherapy: "http://schema.org/duplicateTherapy",
      duration: "http://schema.org/duration",
      durationOfWarranty: "http://schema.org/durationOfWarranty",
      duringMedia: "http://schema.org/duringMedia",
      earlyPrepaymentPenalty: "http://schema.org/earlyPrepaymentPenalty",
      editEIDR: "http://schema.org/editEIDR",
      editor: "http://schema.org/editor",
      eduQuestionType: "http://schema.org/eduQuestionType",
      educationRequirements: "http://schema.org/educationRequirements",
      educationalAlignment: "http://schema.org/educationalAlignment",
      educationalCredentialAwarded: "http://schema.org/educationalCredentialAwarded",
      educationalFramework: "http://schema.org/educationalFramework",
      educationalLevel: "http://schema.org/educationalLevel",
      educationalProgramMode: "http://schema.org/educationalProgramMode",
      educationalRole: "http://schema.org/educationalRole",
      educationalUse: "http://schema.org/educationalUse",
      elevation: "http://schema.org/elevation",
      eligibilityToWorkRequirement: "http://schema.org/eligibilityToWorkRequirement",
      eligibleCustomerType: "http://schema.org/eligibleCustomerType",
      eligibleDuration: "http://schema.org/eligibleDuration",
      eligibleQuantity: "http://schema.org/eligibleQuantity",
      eligibleRegion: "http://schema.org/eligibleRegion",
      eligibleTransactionVolume: "http://schema.org/eligibleTransactionVolume",
      email: "http://schema.org/email",
      embedUrl: "http://schema.org/embedUrl",
      emissionsCO2: "http://schema.org/emissionsCO2",
      employee: "http://schema.org/employee",
      employees: "http://schema.org/employees",
      employerOverview: "http://schema.org/employerOverview",
      employmentType: "http://schema.org/employmentType",
      employmentUnit: "http://schema.org/employmentUnit",
      encodesCreativeWork: "http://schema.org/encodesCreativeWork",
      encoding: "http://schema.org/encoding",
      encodingFormat: "http://schema.org/encodingFormat",
      encodingType: "http://schema.org/encodingType",
      encodings: "http://schema.org/encodings",
      endDate: "http://schema.org/endDate",
      endOffset: "http://schema.org/endOffset",
      endTime: "http://schema.org/endTime",
      endorsee: "http://schema.org/endorsee",
      endorsers: "http://schema.org/endorsers",
      energyEfficiencyScaleMax: "http://schema.org/energyEfficiencyScaleMax",
      energyEfficiencyScaleMin: "http://schema.org/energyEfficiencyScaleMin",
      engineDisplacement: "http://schema.org/engineDisplacement",
      enginePower: "http://schema.org/enginePower",
      engineType: "http://schema.org/engineType",
      entertainmentBusiness: "http://schema.org/entertainmentBusiness",
      epidemiology: "http://schema.org/epidemiology",
      episode: "http://schema.org/episode",
      episodeNumber: "http://schema.org/episodeNumber",
      episodes: "http://schema.org/episodes",
      equal: "http://schema.org/equal",
      error: "http://schema.org/error",
      estimatedCost: "http://schema.org/estimatedCost",
      estimatedFlightDuration: "http://schema.org/estimatedFlightDuration",
      estimatedSalary: "http://schema.org/estimatedSalary",
      estimatesRiskOf: "http://schema.org/estimatesRiskOf",
      ethicsPolicy: "http://schema.org/ethicsPolicy",
      event: "http://schema.org/event",
      eventAttendanceMode: "http://schema.org/eventAttendanceMode",
      eventSchedule: "http://schema.org/eventSchedule",
      eventStatus: "http://schema.org/eventStatus",
      events: "http://schema.org/events",
      evidenceLevel: "http://schema.org/evidenceLevel",
      evidenceOrigin: "http://schema.org/evidenceOrigin",
      exampleOfWork: "http://schema.org/exampleOfWork",
      exceptDate: "http://schema.org/exceptDate",
      exchangeRateSpread: "http://schema.org/exchangeRateSpread",
      executableLibraryName: "http://schema.org/executableLibraryName",
      exerciseCourse: "http://schema.org/exerciseCourse",
      exercisePlan: "http://schema.org/exercisePlan",
      exerciseRelatedDiet: "http://schema.org/exerciseRelatedDiet",
      exerciseType: "http://schema.org/exerciseType",
      exifData: "http://schema.org/exifData",
      expectedArrivalFrom: "http://schema.org/expectedArrivalFrom",
      expectedArrivalUntil: "http://schema.org/expectedArrivalUntil",
      expectedPrognosis: "http://schema.org/expectedPrognosis",
      expectsAcceptanceOf: "http://schema.org/expectsAcceptanceOf",
      experienceRequirements: "http://schema.org/experienceRequirements",
      expertConsiderations: "http://schema.org/expertConsiderations",
      expires: "http://schema.org/expires",
      familyName: "http://schema.org/familyName",
      fatContent: "http://schema.org/fatContent",
      faxNumber: "http://schema.org/faxNumber",
      featureList: "http://schema.org/featureList",
      feesAndCommissionsSpecification: "http://schema.org/feesAndCommissionsSpecification",
      fiberContent: "http://schema.org/fiberContent",
      fileFormat: "http://schema.org/fileFormat",
      fileSize: "http://schema.org/fileSize",
      financialAidEligible: "http://schema.org/financialAidEligible",
      firstAppearance: "http://schema.org/firstAppearance",
      firstPerformance: "http://schema.org/firstPerformance",
      flightDistance: "http://schema.org/flightDistance",
      flightNumber: "http://schema.org/flightNumber",
      floorLevel: "http://schema.org/floorLevel",
      floorLimit: "http://schema.org/floorLimit",
      floorSize: "http://schema.org/floorSize",
      followee: "http://schema.org/followee",
      follows: "http://schema.org/follows",
      followup: "http://schema.org/followup",
      foodEstablishment: "http://schema.org/foodEstablishment",
      foodEvent: "http://schema.org/foodEvent",
      foodWarning: "http://schema.org/foodWarning",
      founder: "http://schema.org/founder",
      founders: "http://schema.org/founders",
      foundingDate: "http://schema.org/foundingDate",
      foundingLocation: "http://schema.org/foundingLocation",
      free: "http://schema.org/free",
      freeShippingThreshold: "http://schema.org/freeShippingThreshold",
      frequency: "http://schema.org/frequency",
      fromLocation: "http://schema.org/fromLocation",
      fuelCapacity: "http://schema.org/fuelCapacity",
      fuelConsumption: "http://schema.org/fuelConsumption",
      fuelEfficiency: "http://schema.org/fuelEfficiency",
      fuelType: "http://schema.org/fuelType",
      functionalClass: "http://schema.org/functionalClass",
      fundedItem: "http://schema.org/fundedItem",
      funder: "http://schema.org/funder",
      game: "http://schema.org/game",
      gameItem: "http://schema.org/gameItem",
      gameLocation: "http://schema.org/gameLocation",
      gamePlatform: "http://schema.org/gamePlatform",
      gameServer: "http://schema.org/gameServer",
      gameTip: "http://schema.org/gameTip",
      gender: "http://schema.org/gender",
      genre: "http://schema.org/genre",
      geo: "http://schema.org/geo",
      geoContains: "http://schema.org/geoContains",
      geoCoveredBy: "http://schema.org/geoCoveredBy",
      geoCovers: "http://schema.org/geoCovers",
      geoCrosses: "http://schema.org/geoCrosses",
      geoDisjoint: "http://schema.org/geoDisjoint",
      geoEquals: "http://schema.org/geoEquals",
      geoIntersects: "http://schema.org/geoIntersects",
      geoMidpoint: "http://schema.org/geoMidpoint",
      geoOverlaps: "http://schema.org/geoOverlaps",
      geoRadius: "http://schema.org/geoRadius",
      geoTouches: "http://schema.org/geoTouches",
      geoWithin: "http://schema.org/geoWithin",
      geographicArea: "http://schema.org/geographicArea",
      gettingTestedInfo: "http://schema.org/gettingTestedInfo",
      givenName: "http://schema.org/givenName",
      globalLocationNumber: "http://schema.org/globalLocationNumber",
      governmentBenefitsInfo: "http://schema.org/governmentBenefitsInfo",
      gracePeriod: "http://schema.org/gracePeriod",
      grantee: "http://schema.org/grantee",
      greater: "http://schema.org/greater",
      greaterOrEqual: "http://schema.org/greaterOrEqual",
      gtin: "http://schema.org/gtin",
      gtin12: "http://schema.org/gtin12",
      gtin13: "http://schema.org/gtin13",
      gtin14: "http://schema.org/gtin14",
      gtin8: "http://schema.org/gtin8",
      guideline: "http://schema.org/guideline",
      guidelineDate: "http://schema.org/guidelineDate",
      guidelineSubject: "http://schema.org/guidelineSubject",
      handlingTime: "http://schema.org/handlingTime",
      hasBroadcastChannel: "http://schema.org/hasBroadcastChannel",
      hasCategoryCode: "http://schema.org/hasCategoryCode",
      hasCourse: "http://schema.org/hasCourse",
      hasCourseInstance: "http://schema.org/hasCourseInstance",
      hasCredential: "http://schema.org/hasCredential",
      hasDefinedTerm: "http://schema.org/hasDefinedTerm",
      hasDeliveryMethod: "http://schema.org/hasDeliveryMethod",
      hasDigitalDocumentPermission: "http://schema.org/hasDigitalDocumentPermission",
      hasDriveThroughService: "http://schema.org/hasDriveThroughService",
      hasEnergyConsumptionDetails: "http://schema.org/hasEnergyConsumptionDetails",
      hasEnergyEfficiencyCategory: "http://schema.org/hasEnergyEfficiencyCategory",
      hasHealthAspect: "http://schema.org/hasHealthAspect",
      hasMap: "http://schema.org/hasMap",
      hasMenu: "http://schema.org/hasMenu",
      hasMenuItem: "http://schema.org/hasMenuItem",
      hasMenuSection: "http://schema.org/hasMenuSection",
      hasMerchantReturnPolicy: "http://schema.org/hasMerchantReturnPolicy",
      hasOccupation: "http://schema.org/hasOccupation",
      hasOfferCatalog: "http://schema.org/hasOfferCatalog",
      hasPOS: "http://schema.org/hasPOS",
      hasPart: "http://schema.org/hasPart",
      hasProductReturnPolicy: "http://schema.org/hasProductReturnPolicy",
      hasVariant: "http://schema.org/hasVariant",
      headline: "http://schema.org/headline",
      healthCondition: "http://schema.org/healthCondition",
      healthPlanCoinsuranceOption: "http://schema.org/healthPlanCoinsuranceOption",
      healthPlanCoinsuranceRate: "http://schema.org/healthPlanCoinsuranceRate",
      healthPlanCopay: "http://schema.org/healthPlanCopay",
      healthPlanCopayOption: "http://schema.org/healthPlanCopayOption",
      healthPlanCostSharing: "http://schema.org/healthPlanCostSharing",
      healthPlanDrugOption: "http://schema.org/healthPlanDrugOption",
      healthPlanDrugTier: "http://schema.org/healthPlanDrugTier",
      healthPlanId: "http://schema.org/healthPlanId",
      healthPlanMarketingUrl: "http://schema.org/healthPlanMarketingUrl",
      healthPlanNetworkId: "http://schema.org/healthPlanNetworkId",
      healthPlanNetworkTier: "http://schema.org/healthPlanNetworkTier",
      healthPlanPharmacyCategory: "http://schema.org/healthPlanPharmacyCategory",
      healthcareReportingData: "http://schema.org/healthcareReportingData",
      height: "http://schema.org/height",
      highPrice: "http://schema.org/highPrice",
      hiringOrganization: "http://schema.org/hiringOrganization",
      holdingArchive: "http://schema.org/holdingArchive",
      homeLocation: "http://schema.org/homeLocation",
      homeTeam: "http://schema.org/homeTeam",
      honorificPrefix: "http://schema.org/honorificPrefix",
      honorificSuffix: "http://schema.org/honorificSuffix",
      hospitalAffiliation: "http://schema.org/hospitalAffiliation",
      hostingOrganization: "http://schema.org/hostingOrganization",
      hoursAvailable: "http://schema.org/hoursAvailable",
      howPerformed: "http://schema.org/howPerformed",
      httpMethod: "http://schema.org/httpMethod",
      iataCode: "http://schema.org/iataCode",
      icaoCode: "http://schema.org/icaoCode",
      identifier: "http://schema.org/identifier",
      identifyingExam: "http://schema.org/identifyingExam",
      identifyingTest: "http://schema.org/identifyingTest",
      illustrator: "http://schema.org/illustrator",
      image: "http://schema.org/image",
      imagingTechnique: "http://schema.org/imagingTechnique",
      inAlbum: "http://schema.org/inAlbum",
      inBroadcastLineup: "http://schema.org/inBroadcastLineup",
      inCodeSet: "http://schema.org/inCodeSet",
      inDefinedTermSet: "http://schema.org/inDefinedTermSet",
      inLanguage: "http://schema.org/inLanguage",
      inPlaylist: "http://schema.org/inPlaylist",
      inProductGroupWithID: "http://schema.org/inProductGroupWithID",
      inStoreReturnsOffered: "http://schema.org/inStoreReturnsOffered",
      inSupportOf: "http://schema.org/inSupportOf",
      incentiveCompensation: "http://schema.org/incentiveCompensation",
      incentives: "http://schema.org/incentives",
      includedComposition: "http://schema.org/includedComposition",
      includedDataCatalog: "http://schema.org/includedDataCatalog",
      includedInDataCatalog: "http://schema.org/includedInDataCatalog",
      includedInHealthInsurancePlan: "http://schema.org/includedInHealthInsurancePlan",
      includedRiskFactor: "http://schema.org/includedRiskFactor",
      includesAttraction: "http://schema.org/includesAttraction",
      includesHealthPlanFormulary: "http://schema.org/includesHealthPlanFormulary",
      includesHealthPlanNetwork: "http://schema.org/includesHealthPlanNetwork",
      includesObject: "http://schema.org/includesObject",
      increasesRiskOf: "http://schema.org/increasesRiskOf",
      industry: "http://schema.org/industry",
      ineligibleRegion: "http://schema.org/ineligibleRegion",
      infectiousAgent: "http://schema.org/infectiousAgent",
      infectiousAgentClass: "http://schema.org/infectiousAgentClass",
      ingredients: "http://schema.org/ingredients",
      inker: "http://schema.org/inker",
      insertion: "http://schema.org/insertion",
      installUrl: "http://schema.org/installUrl",
      instructor: "http://schema.org/instructor",
      instrument: "http://schema.org/instrument",
      intensity: "http://schema.org/intensity",
      interactingDrug: "http://schema.org/interactingDrug",
      interactionCount: "http://schema.org/interactionCount",
      interactionService: "http://schema.org/interactionService",
      interactionStatistic: "http://schema.org/interactionStatistic",
      interactionType: "http://schema.org/interactionType",
      interactivityType: "http://schema.org/interactivityType",
      interestRate: "http://schema.org/interestRate",
      inventoryLevel: "http://schema.org/inventoryLevel",
      inverseOf: "http://schema.org/inverseOf",
      isAcceptingNewPatients: "http://schema.org/isAcceptingNewPatients",
      isAccessibleForFree: "http://schema.org/isAccessibleForFree",
      isAccessoryOrSparePartFor: "http://schema.org/isAccessoryOrSparePartFor",
      isAvailableGenerically: "http://schema.org/isAvailableGenerically",
      isBasedOn: "http://schema.org/isBasedOn",
      isBasedOnUrl: "http://schema.org/isBasedOnUrl",
      isConsumableFor: "http://schema.org/isConsumableFor",
      isFamilyFriendly: "http://schema.org/isFamilyFriendly",
      isGift: "http://schema.org/isGift",
      isLiveBroadcast: "http://schema.org/isLiveBroadcast",
      isPartOf: "http://schema.org/isPartOf",
      isPlanForApartment: "http://schema.org/isPlanForApartment",
      isProprietary: "http://schema.org/isProprietary",
      isRelatedTo: "http://schema.org/isRelatedTo",
      isResizable: "http://schema.org/isResizable",
      isSimilarTo: "http://schema.org/isSimilarTo",
      isUnlabelledFallback: "http://schema.org/isUnlabelledFallback",
      isVariantOf: "http://schema.org/isVariantOf",
      isbn: "http://schema.org/isbn",
      isicV4: "http://schema.org/isicV4",
      isrcCode: "http://schema.org/isrcCode",
      issn: "http://schema.org/issn",
      issueNumber: "http://schema.org/issueNumber",
      issuedBy: "http://schema.org/issuedBy",
      issuedThrough: "http://schema.org/issuedThrough",
      iswcCode: "http://schema.org/iswcCode",
      item: "http://schema.org/item",
      itemCondition: "http://schema.org/itemCondition",
      itemListElement: "http://schema.org/itemListElement",
      itemListOrder: "http://schema.org/itemListOrder",
      itemLocation: "http://schema.org/itemLocation",
      itemOffered: "http://schema.org/itemOffered",
      itemReviewed: "http://schema.org/itemReviewed",
      itemShipped: "http://schema.org/itemShipped",
      itinerary: "http://schema.org/itinerary",
      jobBenefits: "http://schema.org/jobBenefits",
      jobImmediateStart: "http://schema.org/jobImmediateStart",
      jobLocation: "http://schema.org/jobLocation",
      jobLocationType: "http://schema.org/jobLocationType",
      jobStartDate: "http://schema.org/jobStartDate",
      jobTitle: "http://schema.org/jobTitle",
      jurisdiction: "http://schema.org/jurisdiction",
      keywords: "http://schema.org/keywords",
      knownVehicleDamages: "http://schema.org/knownVehicleDamages",
      knows: "http://schema.org/knows",
      knowsAbout: "http://schema.org/knowsAbout",
      knowsLanguage: "http://schema.org/knowsLanguage",
      labelDetails: "http://schema.org/labelDetails",
      landlord: "http://schema.org/landlord",
      language: "http://schema.org/language",
      lastReviewed: "http://schema.org/lastReviewed",
      latitude: "http://schema.org/latitude",
      layoutImage: "http://schema.org/layoutImage",
      learningResourceType: "http://schema.org/learningResourceType",
      leaseLength: "http://schema.org/leaseLength",
      legalName: "http://schema.org/legalName",
      legalStatus: "http://schema.org/legalStatus",
      legislationApplies: "http://schema.org/legislationApplies",
      legislationChanges: "http://schema.org/legislationChanges",
      legislationConsolidates: "http://schema.org/legislationConsolidates",
      legislationDate: "http://schema.org/legislationDate",
      legislationDateVersion: "http://schema.org/legislationDateVersion",
      legislationIdentifier: "http://schema.org/legislationIdentifier",
      legislationJurisdiction: "http://schema.org/legislationJurisdiction",
      legislationLegalForce: "http://schema.org/legislationLegalForce",
      legislationLegalValue: "http://schema.org/legislationLegalValue",
      legislationPassedBy: "http://schema.org/legislationPassedBy",
      legislationResponsible: "http://schema.org/legislationResponsible",
      legislationTransposes: "http://schema.org/legislationTransposes",
      legislationType: "http://schema.org/legislationType",
      leiCode: "http://schema.org/leiCode",
      lender: "http://schema.org/lender",
      lesser: "http://schema.org/lesser",
      lesserOrEqual: "http://schema.org/lesserOrEqual",
      letterer: "http://schema.org/letterer",
      license: "http://schema.org/license",
      line: "http://schema.org/line",
      linkRelationship: "http://schema.org/linkRelationship",
      liveBlogUpdate: "http://schema.org/liveBlogUpdate",
      loanMortgageMandateAmount: "http://schema.org/loanMortgageMandateAmount",
      loanPaymentAmount: "http://schema.org/loanPaymentAmount",
      loanPaymentFrequency: "http://schema.org/loanPaymentFrequency",
      loanRepaymentForm: "http://schema.org/loanRepaymentForm",
      loanTerm: "http://schema.org/loanTerm",
      loanType: "http://schema.org/loanType",
      location: "http://schema.org/location",
      locationCreated: "http://schema.org/locationCreated",
      lodgingUnitDescription: "http://schema.org/lodgingUnitDescription",
      lodgingUnitType: "http://schema.org/lodgingUnitType",
      logo: "http://schema.org/logo",
      longitude: "http://schema.org/longitude",
      loser: "http://schema.org/loser",
      lowPrice: "http://schema.org/lowPrice",
      lyricist: "http://schema.org/lyricist",
      lyrics: "http://schema.org/lyrics",
      mainContentOfPage: "http://schema.org/mainContentOfPage",
      mainEntity: "http://schema.org/mainEntity",
      mainEntityOfPage: "http://schema.org/mainEntityOfPage",
      maintainer: "http://schema.org/maintainer",
      makesOffer: "http://schema.org/makesOffer",
      manufacturer: "http://schema.org/manufacturer",
      map: "http://schema.org/map",
      mapType: "http://schema.org/mapType",
      maps: "http://schema.org/maps",
      marginOfError: "http://schema.org/marginOfError",
      masthead: "http://schema.org/masthead",
      material: "http://schema.org/material",
      materialExtent: "http://schema.org/materialExtent",
      maxPrice: "http://schema.org/maxPrice",
      maxValue: "http://schema.org/maxValue",
      maximumAttendeeCapacity: "http://schema.org/maximumAttendeeCapacity",
      maximumEnrollment: "http://schema.org/maximumEnrollment",
      maximumIntake: "http://schema.org/maximumIntake",
      maximumPhysicalAttendeeCapacity: "http://schema.org/maximumPhysicalAttendeeCapacity",
      maximumVirtualAttendeeCapacity: "http://schema.org/maximumVirtualAttendeeCapacity",
      mealService: "http://schema.org/mealService",
      measuredProperty: "http://schema.org/measuredProperty",
      measuredValue: "http://schema.org/measuredValue",
      measurementTechnique: "http://schema.org/measurementTechnique",
      mechanismOfAction: "http://schema.org/mechanismOfAction",
      mediaAuthenticityCategory: "http://schema.org/mediaAuthenticityCategory",
      median: "http://schema.org/median",
      medicalAudience: "http://schema.org/medicalAudience",
      medicalSpecialty: "http://schema.org/medicalSpecialty",
      medicineSystem: "http://schema.org/medicineSystem",
      meetsEmissionStandard: "http://schema.org/meetsEmissionStandard",
      member: "http://schema.org/member",
      memberOf: "http://schema.org/memberOf",
      members: "http://schema.org/members",
      membershipNumber: "http://schema.org/membershipNumber",
      membershipPointsEarned: "http://schema.org/membershipPointsEarned",
      memoryRequirements: "http://schema.org/memoryRequirements",
      mentions: "http://schema.org/mentions",
      menu: "http://schema.org/menu",
      menuAddOn: "http://schema.org/menuAddOn",
      merchant: "http://schema.org/merchant",
      merchantReturnDays: "http://schema.org/merchantReturnDays",
      merchantReturnLink: "http://schema.org/merchantReturnLink",
      messageAttachment: "http://schema.org/messageAttachment",
      mileageFromOdometer: "http://schema.org/mileageFromOdometer",
      minPrice: "http://schema.org/minPrice",
      minValue: "http://schema.org/minValue",
      minimumPaymentDue: "http://schema.org/minimumPaymentDue",
      missionCoveragePrioritiesPolicy: "http://schema.org/missionCoveragePrioritiesPolicy",
      model: "http://schema.org/model",
      modelDate: "http://schema.org/modelDate",
      modifiedTime: "http://schema.org/modifiedTime",
      monthlyMinimumRepaymentAmount: "http://schema.org/monthlyMinimumRepaymentAmount",
      mpn: "http://schema.org/mpn",
      multipleValues: "http://schema.org/multipleValues",
      muscleAction: "http://schema.org/muscleAction",
      musicArrangement: "http://schema.org/musicArrangement",
      musicBy: "http://schema.org/musicBy",
      musicCompositionForm: "http://schema.org/musicCompositionForm",
      musicGroupMember: "http://schema.org/musicGroupMember",
      musicReleaseFormat: "http://schema.org/musicReleaseFormat",
      musicalKey: "http://schema.org/musicalKey",
      naics: "http://schema.org/naics",
      name: "http://schema.org/name",
      namedPosition: "http://schema.org/namedPosition",
      nationality: "http://schema.org/nationality",
      naturalProgression: "http://schema.org/naturalProgression",
      nerve: "http://schema.org/nerve",
      nerveMotor: "http://schema.org/nerveMotor",
      netWorth: "http://schema.org/netWorth",
      newsUpdatesAndGuidelines: "http://schema.org/newsUpdatesAndGuidelines",
      nextItem: "http://schema.org/nextItem",
      noBylinesPolicy: "http://schema.org/noBylinesPolicy",
      nonEqual: "http://schema.org/nonEqual",
      nonProprietaryName: "http://schema.org/nonProprietaryName",
      nonprofitStatus: "http://schema.org/nonprofitStatus",
      normalRange: "http://schema.org/normalRange",
      nsn: "http://schema.org/nsn",
      numAdults: "http://schema.org/numAdults",
      numChildren: "http://schema.org/numChildren",
      numConstraints: "http://schema.org/numConstraints",
      numTracks: "http://schema.org/numTracks",
      numberOfAccommodationUnits: "http://schema.org/numberOfAccommodationUnits",
      numberOfAirbags: "http://schema.org/numberOfAirbags",
      numberOfAvailableAccommodationUnits: "http://schema.org/numberOfAvailableAccommodationUnits",
      numberOfAxles: "http://schema.org/numberOfAxles",
      numberOfBathroomsTotal: "http://schema.org/numberOfBathroomsTotal",
      numberOfBedrooms: "http://schema.org/numberOfBedrooms",
      numberOfBeds: "http://schema.org/numberOfBeds",
      numberOfCredits: "http://schema.org/numberOfCredits",
      numberOfDoors: "http://schema.org/numberOfDoors",
      numberOfEmployees: "http://schema.org/numberOfEmployees",
      numberOfEpisodes: "http://schema.org/numberOfEpisodes",
      numberOfForwardGears: "http://schema.org/numberOfForwardGears",
      numberOfFullBathrooms: "http://schema.org/numberOfFullBathrooms",
      numberOfItems: "http://schema.org/numberOfItems",
      numberOfLoanPayments: "http://schema.org/numberOfLoanPayments",
      numberOfPages: "http://schema.org/numberOfPages",
      numberOfPartialBathrooms: "http://schema.org/numberOfPartialBathrooms",
      numberOfPlayers: "http://schema.org/numberOfPlayers",
      numberOfPreviousOwners: "http://schema.org/numberOfPreviousOwners",
      numberOfRooms: "http://schema.org/numberOfRooms",
      numberOfSeasons: "http://schema.org/numberOfSeasons",
      numberedPosition: "http://schema.org/numberedPosition",
      nutrition: "http://schema.org/nutrition",
      object: "http://schema.org/object",
      observationDate: "http://schema.org/observationDate",
      observedNode: "http://schema.org/observedNode",
      occupancy: "http://schema.org/occupancy",
      occupationLocation: "http://schema.org/occupationLocation",
      occupationalCategory: "http://schema.org/occupationalCategory",
      occupationalCredentialAwarded: "http://schema.org/occupationalCredentialAwarded",
      offerCount: "http://schema.org/offerCount",
      offeredBy: "http://schema.org/offeredBy",
      offers: "http://schema.org/offers",
      offersPrescriptionByMail: "http://schema.org/offersPrescriptionByMail",
      openingHours: "http://schema.org/openingHours",
      openingHoursSpecification: "http://schema.org/openingHoursSpecification",
      opens: "http://schema.org/opens",
      operatingSystem: "http://schema.org/operatingSystem",
      opponent: "http://schema.org/opponent",
      option: "http://schema.org/option",
      orderDate: "http://schema.org/orderDate",
      orderDelivery: "http://schema.org/orderDelivery",
      orderItemNumber: "http://schema.org/orderItemNumber",
      orderItemStatus: "http://schema.org/orderItemStatus",
      orderNumber: "http://schema.org/orderNumber",
      orderQuantity: "http://schema.org/orderQuantity",
      orderStatus: "http://schema.org/orderStatus",
      orderedItem: "http://schema.org/orderedItem",
      organizer: "http://schema.org/organizer",
      originAddress: "http://schema.org/originAddress",
      originatesFrom: "http://schema.org/originatesFrom",
      overdosage: "http://schema.org/overdosage",
      ownedFrom: "http://schema.org/ownedFrom",
      ownedThrough: "http://schema.org/ownedThrough",
      ownershipFundingInfo: "http://schema.org/ownershipFundingInfo",
      owns: "http://schema.org/owns",
      pageEnd: "http://schema.org/pageEnd",
      pageStart: "http://schema.org/pageStart",
      pagination: "http://schema.org/pagination",
      parent: "http://schema.org/parent",
      parentItem: "http://schema.org/parentItem",
      parentOrganization: "http://schema.org/parentOrganization",
      parentService: "http://schema.org/parentService",
      parents: "http://schema.org/parents",
      partOfEpisode: "http://schema.org/partOfEpisode",
      partOfInvoice: "http://schema.org/partOfInvoice",
      partOfOrder: "http://schema.org/partOfOrder",
      partOfSeason: "http://schema.org/partOfSeason",
      partOfSeries: "http://schema.org/partOfSeries",
      partOfSystem: "http://schema.org/partOfSystem",
      partOfTVSeries: "http://schema.org/partOfTVSeries",
      partOfTrip: "http://schema.org/partOfTrip",
      participant: "http://schema.org/participant",
      partySize: "http://schema.org/partySize",
      passengerPriorityStatus: "http://schema.org/passengerPriorityStatus",
      passengerSequenceNumber: "http://schema.org/passengerSequenceNumber",
      pathophysiology: "http://schema.org/pathophysiology",
      pattern: "http://schema.org/pattern",
      payload: "http://schema.org/payload",
      paymentAccepted: "http://schema.org/paymentAccepted",
      paymentDue: "http://schema.org/paymentDue",
      paymentDueDate: "http://schema.org/paymentDueDate",
      paymentMethod: "http://schema.org/paymentMethod",
      paymentMethodId: "http://schema.org/paymentMethodId",
      paymentStatus: "http://schema.org/paymentStatus",
      paymentUrl: "http://schema.org/paymentUrl",
      penciler: "http://schema.org/penciler",
      percentile10: "http://schema.org/percentile10",
      percentile25: "http://schema.org/percentile25",
      percentile75: "http://schema.org/percentile75",
      percentile90: "http://schema.org/percentile90",
      performTime: "http://schema.org/performTime",
      performer: "http://schema.org/performer",
      performerIn: "http://schema.org/performerIn",
      performers: "http://schema.org/performers",
      permissionType: "http://schema.org/permissionType",
      permissions: "http://schema.org/permissions",
      permitAudience: "http://schema.org/permitAudience",
      permittedUsage: "http://schema.org/permittedUsage",
      petsAllowed: "http://schema.org/petsAllowed",
      phoneticText: "http://schema.org/phoneticText",
      photo: "http://schema.org/photo",
      photos: "http://schema.org/photos",
      physicalRequirement: "http://schema.org/physicalRequirement",
      physiologicalBenefits: "http://schema.org/physiologicalBenefits",
      pickupLocation: "http://schema.org/pickupLocation",
      pickupTime: "http://schema.org/pickupTime",
      playMode: "http://schema.org/playMode",
      playerType: "http://schema.org/playerType",
      playersOnline: "http://schema.org/playersOnline",
      polygon: "http://schema.org/polygon",
      populationType: "http://schema.org/populationType",
      position: "http://schema.org/position",
      possibleComplication: "http://schema.org/possibleComplication",
      possibleTreatment: "http://schema.org/possibleTreatment",
      postOfficeBoxNumber: "http://schema.org/postOfficeBoxNumber",
      postOp: "http://schema.org/postOp",
      postalCode: "http://schema.org/postalCode",
      postalCodeBegin: "http://schema.org/postalCodeBegin",
      postalCodeEnd: "http://schema.org/postalCodeEnd",
      postalCodePrefix: "http://schema.org/postalCodePrefix",
      postalCodeRange: "http://schema.org/postalCodeRange",
      potentialAction: "http://schema.org/potentialAction",
      preOp: "http://schema.org/preOp",
      predecessorOf: "http://schema.org/predecessorOf",
      pregnancyCategory: "http://schema.org/pregnancyCategory",
      pregnancyWarning: "http://schema.org/pregnancyWarning",
      prepTime: "http://schema.org/prepTime",
      preparation: "http://schema.org/preparation",
      prescribingInfo: "http://schema.org/prescribingInfo",
      prescriptionStatus: "http://schema.org/prescriptionStatus",
      previousItem: "http://schema.org/previousItem",
      previousStartDate: "http://schema.org/previousStartDate",
      price: "http://schema.org/price",
      priceComponent: "http://schema.org/priceComponent",
      priceCurrency: "http://schema.org/priceCurrency",
      priceRange: "http://schema.org/priceRange",
      priceSpecification: "http://schema.org/priceSpecification",
      priceType: "http://schema.org/priceType",
      priceValidUntil: "http://schema.org/priceValidUntil",
      primaryImageOfPage: "http://schema.org/primaryImageOfPage",
      primaryPrevention: "http://schema.org/primaryPrevention",
      printColumn: "http://schema.org/printColumn",
      printEdition: "http://schema.org/printEdition",
      printPage: "http://schema.org/printPage",
      printSection: "http://schema.org/printSection",
      procedure: "http://schema.org/procedure",
      procedureType: "http://schema.org/procedureType",
      processingTime: "http://schema.org/processingTime",
      processorRequirements: "http://schema.org/processorRequirements",
      producer: "http://schema.org/producer",
      produces: "http://schema.org/produces",
      productGroupID: "http://schema.org/productGroupID",
      productID: "http://schema.org/productID",
      productReturnDays: "http://schema.org/productReturnDays",
      productReturnLink: "http://schema.org/productReturnLink",
      productSupported: "http://schema.org/productSupported",
      productionCompany: "http://schema.org/productionCompany",
      productionDate: "http://schema.org/productionDate",
      proficiencyLevel: "http://schema.org/proficiencyLevel",
      programMembershipUsed: "http://schema.org/programMembershipUsed",
      programName: "http://schema.org/programName",
      programPrerequisites: "http://schema.org/programPrerequisites",
      programType: "http://schema.org/programType",
      programmingLanguage: "http://schema.org/programmingLanguage",
      programmingModel: "http://schema.org/programmingModel",
      propertyID: "http://schema.org/propertyID",
      proprietaryName: "http://schema.org/proprietaryName",
      proteinContent: "http://schema.org/proteinContent",
      provider: "http://schema.org/provider",
      providerMobility: "http://schema.org/providerMobility",
      providesBroadcastService: "http://schema.org/providesBroadcastService",
      providesService: "http://schema.org/providesService",
      publicAccess: "http://schema.org/publicAccess",
      publicTransportClosuresInfo: "http://schema.org/publicTransportClosuresInfo",
      publication: "http://schema.org/publication",
      publicationType: "http://schema.org/publicationType",
      publishedBy: "http://schema.org/publishedBy",
      publishedOn: "http://schema.org/publishedOn",
      publisher: "http://schema.org/publisher",
      publisherImprint: "http://schema.org/publisherImprint",
      publishingPrinciples: "http://schema.org/publishingPrinciples",
      purchaseDate: "http://schema.org/purchaseDate",
      qualifications: "http://schema.org/qualifications",
      quarantineGuidelines: "http://schema.org/quarantineGuidelines",
      query: "http://schema.org/query",
      quest: "http://schema.org/quest",
      question: "http://schema.org/question",
      rangeIncludes: "http://schema.org/rangeIncludes",
      ratingCount: "http://schema.org/ratingCount",
      ratingExplanation: "http://schema.org/ratingExplanation",
      ratingValue: "http://schema.org/ratingValue",
      readBy: "http://schema.org/readBy",
      readonlyValue: "http://schema.org/readonlyValue",
      realEstateAgent: "http://schema.org/realEstateAgent",
      recipe: "http://schema.org/recipe",
      recipeCategory: "http://schema.org/recipeCategory",
      recipeCuisine: "http://schema.org/recipeCuisine",
      recipeIngredient: "http://schema.org/recipeIngredient",
      recipeInstructions: "http://schema.org/recipeInstructions",
      recipeYield: "http://schema.org/recipeYield",
      recipient: "http://schema.org/recipient",
      recognizedBy: "http://schema.org/recognizedBy",
      recognizingAuthority: "http://schema.org/recognizingAuthority",
      recommendationStrength: "http://schema.org/recommendationStrength",
      recommendedIntake: "http://schema.org/recommendedIntake",
      recordLabel: "http://schema.org/recordLabel",
      recordedAs: "http://schema.org/recordedAs",
      recordedAt: "http://schema.org/recordedAt",
      recordedIn: "http://schema.org/recordedIn",
      recordingOf: "http://schema.org/recordingOf",
      recourseLoan: "http://schema.org/recourseLoan",
      referenceQuantity: "http://schema.org/referenceQuantity",
      referencesOrder: "http://schema.org/referencesOrder",
      refundType: "http://schema.org/refundType",
      regionDrained: "http://schema.org/regionDrained",
      regionsAllowed: "http://schema.org/regionsAllowed",
      relatedAnatomy: "http://schema.org/relatedAnatomy",
      relatedCondition: "http://schema.org/relatedCondition",
      relatedDrug: "http://schema.org/relatedDrug",
      relatedLink: "http://schema.org/relatedLink",
      relatedStructure: "http://schema.org/relatedStructure",
      relatedTherapy: "http://schema.org/relatedTherapy",
      relatedTo: "http://schema.org/relatedTo",
      releaseDate: "http://schema.org/releaseDate",
      releaseNotes: "http://schema.org/releaseNotes",
      releaseOf: "http://schema.org/releaseOf",
      releasedEvent: "http://schema.org/releasedEvent",
      relevantOccupation: "http://schema.org/relevantOccupation",
      relevantSpecialty: "http://schema.org/relevantSpecialty",
      remainingAttendeeCapacity: "http://schema.org/remainingAttendeeCapacity",
      renegotiableLoan: "http://schema.org/renegotiableLoan",
      repeatCount: "http://schema.org/repeatCount",
      repeatFrequency: "http://schema.org/repeatFrequency",
      repetitions: "http://schema.org/repetitions",
      replacee: "http://schema.org/replacee",
      replacer: "http://schema.org/replacer",
      replyToUrl: "http://schema.org/replyToUrl",
      reportNumber: "http://schema.org/reportNumber",
      representativeOfPage: "http://schema.org/representativeOfPage",
      requiredCollateral: "http://schema.org/requiredCollateral",
      requiredGender: "http://schema.org/requiredGender",
      requiredMaxAge: "http://schema.org/requiredMaxAge",
      requiredMinAge: "http://schema.org/requiredMinAge",
      requiredQuantity: "http://schema.org/requiredQuantity",
      requirements: "http://schema.org/requirements",
      requiresSubscription: "http://schema.org/requiresSubscription",
      reservationFor: "http://schema.org/reservationFor",
      reservationId: "http://schema.org/reservationId",
      reservationStatus: "http://schema.org/reservationStatus",
      reservedTicket: "http://schema.org/reservedTicket",
      responsibilities: "http://schema.org/responsibilities",
      restPeriods: "http://schema.org/restPeriods",
      result: "http://schema.org/result",
      resultComment: "http://schema.org/resultComment",
      resultReview: "http://schema.org/resultReview",
      returnFees: "http://schema.org/returnFees",
      returnPolicyCategory: "http://schema.org/returnPolicyCategory",
      review: "http://schema.org/review",
      reviewAspect: "http://schema.org/reviewAspect",
      reviewBody: "http://schema.org/reviewBody",
      reviewCount: "http://schema.org/reviewCount",
      reviewRating: "http://schema.org/reviewRating",
      reviewedBy: "http://schema.org/reviewedBy",
      reviews: "http://schema.org/reviews",
      riskFactor: "http://schema.org/riskFactor",
      risks: "http://schema.org/risks",
      roleName: "http://schema.org/roleName",
      roofLoad: "http://schema.org/roofLoad",
      rsvpResponse: "http://schema.org/rsvpResponse",
      runsTo: "http://schema.org/runsTo",
      runtime: "http://schema.org/runtime",
      runtimePlatform: "http://schema.org/runtimePlatform",
      rxcui: "http://schema.org/rxcui",
      safetyConsideration: "http://schema.org/safetyConsideration",
      salaryCurrency: "http://schema.org/salaryCurrency",
      salaryUponCompletion: "http://schema.org/salaryUponCompletion",
      sameAs: "http://schema.org/sameAs",
      sampleType: "http://schema.org/sampleType",
      saturatedFatContent: "http://schema.org/saturatedFatContent",
      scheduleTimezone: "http://schema.org/scheduleTimezone",
      scheduledPaymentDate: "http://schema.org/scheduledPaymentDate",
      scheduledTime: "http://schema.org/scheduledTime",
      schemaVersion: "http://schema.org/schemaVersion",
      schoolClosuresInfo: "http://schema.org/schoolClosuresInfo",
      screenCount: "http://schema.org/screenCount",
      screenshot: "http://schema.org/screenshot",
      sdDatePublished: "http://schema.org/sdDatePublished",
      sdLicense: "http://schema.org/sdLicense",
      sdPublisher: "http://schema.org/sdPublisher",
      season: "http://schema.org/season",
      seasonNumber: "http://schema.org/seasonNumber",
      seasons: "http://schema.org/seasons",
      seatNumber: "http://schema.org/seatNumber",
      seatRow: "http://schema.org/seatRow",
      seatSection: "http://schema.org/seatSection",
      seatingCapacity: "http://schema.org/seatingCapacity",
      seatingType: "http://schema.org/seatingType",
      secondaryPrevention: "http://schema.org/secondaryPrevention",
      securityClearanceRequirement: "http://schema.org/securityClearanceRequirement",
      securityScreening: "http://schema.org/securityScreening",
      seeks: "http://schema.org/seeks",
      seller: "http://schema.org/seller",
      sender: "http://schema.org/sender",
      sensoryRequirement: "http://schema.org/sensoryRequirement",
      sensoryUnit: "http://schema.org/sensoryUnit",
      serialNumber: "http://schema.org/serialNumber",
      seriousAdverseOutcome: "http://schema.org/seriousAdverseOutcome",
      serverStatus: "http://schema.org/serverStatus",
      servesCuisine: "http://schema.org/servesCuisine",
      serviceArea: "http://schema.org/serviceArea",
      serviceAudience: "http://schema.org/serviceAudience",
      serviceLocation: "http://schema.org/serviceLocation",
      serviceOperator: "http://schema.org/serviceOperator",
      serviceOutput: "http://schema.org/serviceOutput",
      servicePhone: "http://schema.org/servicePhone",
      servicePostalAddress: "http://schema.org/servicePostalAddress",
      serviceSmsNumber: "http://schema.org/serviceSmsNumber",
      serviceType: "http://schema.org/serviceType",
      serviceUrl: "http://schema.org/serviceUrl",
      servingSize: "http://schema.org/servingSize",
      sharedContent: "http://schema.org/sharedContent",
      shippingDestination: "http://schema.org/shippingDestination",
      shippingDetails: "http://schema.org/shippingDetails",
      shippingLabel: "http://schema.org/shippingLabel",
      shippingRate: "http://schema.org/shippingRate",
      shippingSettingsLink: "http://schema.org/shippingSettingsLink",
      sibling: "http://schema.org/sibling",
      siblings: "http://schema.org/siblings",
      signDetected: "http://schema.org/signDetected",
      signOrSymptom: "http://schema.org/signOrSymptom",
      significance: "http://schema.org/significance",
      significantLink: "http://schema.org/significantLink",
      significantLinks: "http://schema.org/significantLinks",
      size: "http://schema.org/size",
      skills: "http://schema.org/skills",
      sku: "http://schema.org/sku",
      slogan: "http://schema.org/slogan",
      smokingAllowed: "http://schema.org/smokingAllowed",
      sodiumContent: "http://schema.org/sodiumContent",
      softwareAddOn: "http://schema.org/softwareAddOn",
      softwareHelp: "http://schema.org/softwareHelp",
      softwareRequirements: "http://schema.org/softwareRequirements",
      softwareVersion: "http://schema.org/softwareVersion",
      sourceOrganization: "http://schema.org/sourceOrganization",
      sourcedFrom: "http://schema.org/sourcedFrom",
      spatial: "http://schema.org/spatial",
      spatialCoverage: "http://schema.org/spatialCoverage",
      speakable: "http://schema.org/speakable",
      specialCommitments: "http://schema.org/specialCommitments",
      specialOpeningHoursSpecification: "http://schema.org/specialOpeningHoursSpecification",
      specialty: "http://schema.org/specialty",
      speechToTextMarkup: "http://schema.org/speechToTextMarkup",
      speed: "http://schema.org/speed",
      spokenByCharacter: "http://schema.org/spokenByCharacter",
      sponsor: "http://schema.org/sponsor",
      sport: "http://schema.org/sport",
      sportsActivityLocation: "http://schema.org/sportsActivityLocation",
      sportsEvent: "http://schema.org/sportsEvent",
      sportsTeam: "http://schema.org/sportsTeam",
      spouse: "http://schema.org/spouse",
      stage: "http://schema.org/stage",
      stageAsNumber: "http://schema.org/stageAsNumber",
      starRating: "http://schema.org/starRating",
      startDate: "http://schema.org/startDate",
      startOffset: "http://schema.org/startOffset",
      startTime: "http://schema.org/startTime",
      status: "http://schema.org/status",
      steeringPosition: "http://schema.org/steeringPosition",
      step: "http://schema.org/step",
      stepValue: "http://schema.org/stepValue",
      steps: "http://schema.org/steps",
      storageRequirements: "http://schema.org/storageRequirements",
      streetAddress: "http://schema.org/streetAddress",
      strengthUnit: "http://schema.org/strengthUnit",
      strengthValue: "http://schema.org/strengthValue",
      structuralClass: "http://schema.org/structuralClass",
      study: "http://schema.org/study",
      studyDesign: "http://schema.org/studyDesign",
      studyLocation: "http://schema.org/studyLocation",
      studySubject: "http://schema.org/studySubject",
      stupidProperty: "http://schema.org/stupidProperty",
      subEvent: "http://schema.org/subEvent",
      subEvents: "http://schema.org/subEvents",
      subOrganization: "http://schema.org/subOrganization",
      subReservation: "http://schema.org/subReservation",
      subStageSuffix: "http://schema.org/subStageSuffix",
      subStructure: "http://schema.org/subStructure",
      subTest: "http://schema.org/subTest",
      subTrip: "http://schema.org/subTrip",
      subjectOf: "http://schema.org/subjectOf",
      subtitleLanguage: "http://schema.org/subtitleLanguage",
      successorOf: "http://schema.org/successorOf",
      sugarContent: "http://schema.org/sugarContent",
      suggestedAnswer: "http://schema.org/suggestedAnswer",
      suggestedGender: "http://schema.org/suggestedGender",
      suggestedMaxAge: "http://schema.org/suggestedMaxAge",
      suggestedMinAge: "http://schema.org/suggestedMinAge",
      suitableForDiet: "http://schema.org/suitableForDiet",
      superEvent: "http://schema.org/superEvent",
      supersededBy: "http://schema.org/supersededBy",
      supply: "http://schema.org/supply",
      supplyTo: "http://schema.org/supplyTo",
      supportingData: "http://schema.org/supportingData",
      surface: "http://schema.org/surface",
      target: "http://schema.org/target",
      targetCollection: "http://schema.org/targetCollection",
      targetDescription: "http://schema.org/targetDescription",
      targetName: "http://schema.org/targetName",
      targetPlatform: "http://schema.org/targetPlatform",
      targetPopulation: "http://schema.org/targetPopulation",
      targetProduct: "http://schema.org/targetProduct",
      targetUrl: "http://schema.org/targetUrl",
      taxID: "http://schema.org/taxID",
      teaches: "http://schema.org/teaches",
      telephone: "http://schema.org/telephone",
      temporal: "http://schema.org/temporal",
      temporalCoverage: "http://schema.org/temporalCoverage",
      termCode: "http://schema.org/termCode",
      termDuration: "http://schema.org/termDuration",
      termsOfService: "http://schema.org/termsOfService",
      termsPerYear: "http://schema.org/termsPerYear",
      text: "http://schema.org/text",
      textValue: "http://schema.org/textValue",
      thumbnail: "http://schema.org/thumbnail",
      thumbnailUrl: "http://schema.org/thumbnailUrl",
      tickerSymbol: "http://schema.org/tickerSymbol",
      ticketNumber: "http://schema.org/ticketNumber",
      ticketToken: "http://schema.org/ticketToken",
      ticketedSeat: "http://schema.org/ticketedSeat",
      timeOfDay: "http://schema.org/timeOfDay",
      timeRequired: "http://schema.org/timeRequired",
      timeToComplete: "http://schema.org/timeToComplete",
      tissueSample: "http://schema.org/tissueSample",
      title: "http://schema.org/title",
      titleEIDR: "http://schema.org/titleEIDR",
      toLocation: "http://schema.org/toLocation",
      toRecipient: "http://schema.org/toRecipient",
      tongueWeight: "http://schema.org/tongueWeight",
      tool: "http://schema.org/tool",
      torque: "http://schema.org/torque",
      totalJobOpenings: "http://schema.org/totalJobOpenings",
      totalPaymentDue: "http://schema.org/totalPaymentDue",
      totalPrice: "http://schema.org/totalPrice",
      totalTime: "http://schema.org/totalTime",
      tourBookingPage: "http://schema.org/tourBookingPage",
      touristType: "http://schema.org/touristType",
      track: "http://schema.org/track",
      trackingNumber: "http://schema.org/trackingNumber",
      trackingUrl: "http://schema.org/trackingUrl",
      tracks: "http://schema.org/tracks",
      trailer: "http://schema.org/trailer",
      trailerWeight: "http://schema.org/trailerWeight",
      trainName: "http://schema.org/trainName",
      trainNumber: "http://schema.org/trainNumber",
      trainingSalary: "http://schema.org/trainingSalary",
      transFatContent: "http://schema.org/transFatContent",
      transcript: "http://schema.org/transcript",
      transitTime: "http://schema.org/transitTime",
      transitTimeLabel: "http://schema.org/transitTimeLabel",
      translationOfWork: "http://schema.org/translationOfWork",
      translator: "http://schema.org/translator",
      transmissionMethod: "http://schema.org/transmissionMethod",
      travelBans: "http://schema.org/travelBans",
      trialDesign: "http://schema.org/trialDesign",
      tributary: "http://schema.org/tributary",
      typeOfBed: "http://schema.org/typeOfBed",
      typeOfGood: "http://schema.org/typeOfGood",
      typicalAgeRange: "http://schema.org/typicalAgeRange",
      typicalCreditsPerTerm: "http://schema.org/typicalCreditsPerTerm",
      typicalTest: "http://schema.org/typicalTest",
      underName: "http://schema.org/underName",
      unitCode: "http://schema.org/unitCode",
      unitText: "http://schema.org/unitText",
      unnamedSourcesPolicy: "http://schema.org/unnamedSourcesPolicy",
      unsaturatedFatContent: "http://schema.org/unsaturatedFatContent",
      uploadDate: "http://schema.org/uploadDate",
      upvoteCount: "http://schema.org/upvoteCount",
      url: "http://schema.org/url",
      urlTemplate: "http://schema.org/urlTemplate",
      usageInfo: "http://schema.org/usageInfo",
      usedToDiagnose: "http://schema.org/usedToDiagnose",
      userInteractionCount: "http://schema.org/userInteractionCount",
      usesDevice: "http://schema.org/usesDevice",
      usesHealthPlanIdStandard: "http://schema.org/usesHealthPlanIdStandard",
      validFor: "http://schema.org/validFor",
      validFrom: "http://schema.org/validFrom",
      validIn: "http://schema.org/validIn",
      validThrough: "http://schema.org/validThrough",
      validUntil: "http://schema.org/validUntil",
      value: "http://schema.org/value",
      valueAddedTaxIncluded: "http://schema.org/valueAddedTaxIncluded",
      valueMaxLength: "http://schema.org/valueMaxLength",
      valueMinLength: "http://schema.org/valueMinLength",
      valueName: "http://schema.org/valueName",
      valuePattern: "http://schema.org/valuePattern",
      valueReference: "http://schema.org/valueReference",
      valueRequired: "http://schema.org/valueRequired",
      variableMeasured: "http://schema.org/variableMeasured",
      variablesMeasured: "http://schema.org/variablesMeasured",
      variantCover: "http://schema.org/variantCover",
      variesBy: "http://schema.org/variesBy",
      vatID: "http://schema.org/vatID",
      vehicleConfiguration: "http://schema.org/vehicleConfiguration",
      vehicleEngine: "http://schema.org/vehicleEngine",
      vehicleIdentificationNumber: "http://schema.org/vehicleIdentificationNumber",
      vehicleInteriorColor: "http://schema.org/vehicleInteriorColor",
      vehicleInteriorType: "http://schema.org/vehicleInteriorType",
      vehicleModelDate: "http://schema.org/vehicleModelDate",
      vehicleSeatingCapacity: "http://schema.org/vehicleSeatingCapacity",
      vehicleSpecialUsage: "http://schema.org/vehicleSpecialUsage",
      vehicleTransmission: "http://schema.org/vehicleTransmission",
      vendor: "http://schema.org/vendor",
      verificationFactCheckingPolicy: "http://schema.org/verificationFactCheckingPolicy",
      version: "http://schema.org/version",
      video: "http://schema.org/video",
      videoFormat: "http://schema.org/videoFormat",
      videoFrameSize: "http://schema.org/videoFrameSize",
      videoQuality: "http://schema.org/videoQuality",
      volumeNumber: "http://schema.org/volumeNumber",
      warning: "http://schema.org/warning",
      warranty: "http://schema.org/warranty",
      warrantyPromise: "http://schema.org/warrantyPromise",
      warrantyScope: "http://schema.org/warrantyScope",
      webCheckinTime: "http://schema.org/webCheckinTime",
      webFeed: "http://schema.org/webFeed",
      weight: "http://schema.org/weight",
      weightTotal: "http://schema.org/weightTotal",
      wheelbase: "http://schema.org/wheelbase",
      width: "http://schema.org/width",
      winner: "http://schema.org/winner",
      wordCount: "http://schema.org/wordCount",
      workExample: "http://schema.org/workExample",
      workFeatured: "http://schema.org/workFeatured",
      workHours: "http://schema.org/workHours",
      workLocation: "http://schema.org/workLocation",
      workPerformed: "http://schema.org/workPerformed",
      workPresented: "http://schema.org/workPresented",
      workTranslation: "http://schema.org/workTranslation",
      workload: "http://schema.org/workload",
      worksFor: "http://schema.org/worksFor",
      worstRating: "http://schema.org/worstRating",
      xpath: "http://schema.org/xpath",
      yearBuilt: "http://schema.org/yearBuilt",
      yearlyRevenue: "http://schema.org/yearlyRevenue",
      yearsInOperation: "http://schema.org/yearsInOperation",
      yield: "http://schema.org/yield",
      File: "http://schema.org/MediaObject",
      path: "http://schema.org/contentUrl",
      Journal: "http://schema.org/Periodical",
      "cite-as": "https://www.w3.org/ns/iana/link-relations/relation#cite-as",
      hasFile: "http://pcdm.org/models#hasFile",
      hasMember: "http://pcdm.org/models#hasMember",
      RepositoryCollection: "http://pcdm.org/models#Collection",
      RepositoryObject: "http://pcdm.org/models#object",
      ComputationalWorkflow: "https://bioschemas.org/ComputationalWorkflow",
      input: "https://bioschemas.org/ComputationalWorkflow#input",
      output: "https://bioschemas.org/ComputationalWorkflow#output",
      FormalParameter: "https://bioschemas.org/FormalParameter",
      funding: "http://schema.org/funding",
      wasDerivedFrom: "http://www.w3.org/ns/prov#wasDerivedFrom",
      importedFrom: "http://purl.org/pav/importedFrom",
      importedOn: "http://purl.org/pav/importedOn",
      importedBy: "http://purl.org/pav/importedBy",
      retrievedFrom: "http://purl.org/pav/retrievedFrom",
      retrievedOn: "http://purl.org/pav/retrievedOn",
      retrievedBy: "http://purl.org/pav/retrievedBy",
      conformsTo: "http://purl.org/dc/terms/conformsTo",
      "@label": "http://www.w3.org/2000/01/rdf-schema#label",
      pcdm: "http://pcdm.org/models#",
      bibo: "http://purl.org/ontology/bibo/",
      cc: "http://creativecommons.org/ns#",
      dct: "http://purl.org/dc/terms/",
      foaf: "http://xmlns.com/foaf/0.1/",
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      rdfa: "http://www.w3.org/ns/rdfa#",
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      schema: "http://schema.org/",
      frapo: "http://purl.org/cerif/frapo/",
      rel: "https://www.w3.org/ns/iana/link-relations/relation#",
      pav: "http://purl.org/pav/",
      prov: "http://www.w3.org/ns/prov#",
      wfdesc: "http://purl.org/ro/wfdesc#",
      wfprov: "http://purl.org/ro/wfprov#",
      roterms: "http://purl.org/ro/roterms#",
      wf4ever: "http://purl.org/ro/wf4ever#"
    }
  }
}, st = {
  ro_crate_name: "ro-crate-metadata",
  roCrateMetadataID: ve,
  roCrateMetadataIDs: tt,
  context: ["https://w3id.org/ro/crate/1.1/context", { "@vocab": "http://schema.org/" }],
  /** @ignore */
  standardContexts: it,
  render_script: "https://data.research.uts.edu.au/examples/ro-crate/examples/src/crate.js",
  back_links: Fe,
  back_back_links: ot,
  datasetTemplate: rt,
  metadataFileDescriptorTemplate: at,
  ROCrate_Specification_Identifier: "https://researchobject.github.io/ro-crate/1.0/",
  roCratePreviewFileName: "ro-crate-preview.html",
  pageSize: 50
};
var Ie = st;
let ht = class z {
  /**
   * 
   * @param {object} item 
   * @param {string} type 
   * @return {boolean}
   */
  static hasType(e, t) {
    return z.has(e, "@type", t);
  }
  /**
   * 
   * @param {*} item 
   * @param {string} prop 
   * @param {*} val 
   * @return {boolean}
   */
  static has(e, t, r) {
    return z.asArray(e[t]).some((o) => this.isEqualRef(o, r));
  }
  /**
   * Normalise a value to be an array.
   * Always return a new instance of the array to maintain consistency
   * @param {*} value 
   * @returns {Array}
   */
  static asArray(e) {
    return e == null ? [] : [].concat(e);
  }
  /**
   * Return the current value if it is already an array, else return a new array
   * @param {*} value 
   * @returns {Array}
   */
  static asArrayRef(e) {
    return e == null ? [] : Array.isArray(e) ? e : [e];
  }
  /**
   * Add a type to a JSON-LD item
   * @param {*} item 
   * @param {*} type 
   */
  static addType(e, t) {
    z.add(e, "@type", t);
  }
  /**
   * Add a property to an item
   * @param {*} item 
   * @param {*} prop 
   * @param {*} value 
   */
  static add(e, t, r) {
    var o = z.asArray(e[t]);
    o.includes(r) || o.push(r), e[t] = o.length === 1 ? o[0] : r;
  }
  static union(...e) {
    let t = /* @__PURE__ */ new Set();
    return e.flat().filter((r) => !t.has(r["@id"]) && t.add(r["@id"]));
  }
  /**
   * @template T
   * @param {T} data 
   * @return {T} 
   */
  static clone(e) {
    return Ae(e);
  }
  /**
   * Count the number of properties in an object
   */
  static countProp(e) {
    let t = 0;
    for (const r in e)
      t++;
    return t;
  }
  /**
   * Deep comparison for JSON-serializable plain object
   */
  static isEqual(e, t, r) {
    return J(e, t, r);
  }
  static isEqualRef(e, t) {
    return J(e, t, (r, o) => r["@id"] || o["@id"] ? r["@id"] === o["@id"] : null);
  }
  /**
   * Find if a value (can be primitives, object, or an entity) exists in a list of values  
   * @param {*[]} values 
   * @param {*} val 
   * @returns 
   */
  static exists(e, t) {
    return e.some((r) => J(
      r,
      t,
      (o, s) => o["@id"] || s["@id"] ? o["@id"] === s["@id"] : null
    ));
  }
  constructor() {
    return z;
  }
};
function J(i, e, t) {
  if (i === e || Object.is(i, e)) return !0;
  let r = typeof i;
  if (r === typeof e) {
    if (r === "function") return i.toString() === e.toString();
    if (r === "object" && i.constructor === e.constructor) {
      if (Array.isArray(i) && Array.isArray(e)) {
        if (i.length === e.length) {
          for (let p = 0; p < i.length; ++p)
            if (!J(i[p], e[p])) return !1;
          return !0;
        }
        return !1;
      }
      if (t) {
        let p = t(i, e);
        if (p != null) return p;
      }
      if (Object.getPrototypeOf(i) !== Object.getPrototypeOf(e)) return !1;
      let s = new Set(Object.getOwnPropertyNames(i).concat(Object.getOwnPropertyNames(e)));
      for (const p of s)
        if (!J(i[p], e[p], t)) return !1;
      let c = i[Symbol.iterator], n = e[Symbol.iterator];
      if (typeof c == "function" && typeof n == "function") {
        if (c = c(), n = n(), typeof c == "function" && typeof n == "function") {
          let p = c.next(), l = n.next();
          for (; p && l && (!p.done || !l.done); ) {
            if (!J(p.value, l.value)) return !1;
            p = c.next(), l = n.next();
          }
        }
      } else
        return !1;
      return !0;
    }
  }
  return !1;
}
var ct = Object.prototype;
function Ae(i) {
  var e;
  if (typeof i == "object")
    switch (ct.toString.call(i)) {
      case "[object Object]":
        e = Object.create(Object.getPrototypeOf(i));
        for (const t of Object.keys(i))
          e[t] = Ae(i[t]);
        return e;
      case "[object Array]":
        return i.map(Ae);
      default:
        return JSON.parse(JSON.stringify(i));
    }
  return i;
}
var le = { Utils: ht };
const { Utils: fe } = le, Re = Symbol("target"), xe = Symbol("owner"), Ue = Symbol("node"), nt = Symbol("proxy"), me = Symbol("noderef"), pt = { $target: Re, $owner: xe, $node: Ue, $proxy: nt, $noderef: me };
var V, Be;
let mt = (Be = class {
  /**
   * 
   * @param {NodeRef} ref
   */
  constructor(e) {
    /** 
     * Node reference: A node object used to reference a node having only the @id key.
     * @type {NodeRef} 
     */
    I(this, V);
    if (!e["@id"]) throw new Error("A JSON-LD node must have @id");
    x(this, V, e);
  }
  set "@id"(e) {
    f(this, V)["@id"] = e;
  }
  get "@id"() {
    return f(this, V)["@id"];
  }
  get "@reverse"() {
    return f(this, V)["@reverse"];
  }
  get [me]() {
    return f(this, V);
  }
  /**
   * Return a deep copy of the entity in plain JS object
   */
  toJSON() {
    let e = this[Re] || this, t = { "@id": e["@id"] };
    for (const r in e)
      t[r] = fe.clone(e[r]);
    return t;
  }
  /**
   * Check if an entity has the specified type.
   * @param {*} type 
   * @returns {boolean}
   */
  $$hasType(e) {
    return fe.asArray(this["@type"]).includes(e);
  }
  /**
   * 
   * @param {string} prop 
   * @return {Array}
   */
  $$getAsArray(e) {
    return fe.asArray(this[e]);
  }
}, V = new WeakMap(), Be), gt = class {
  /**
   * 
   * @param {EntityCollection} owner 
   */
  constructor(e) {
    this.owner = e;
  }
  /**
   * 
   * @param {Node} target 
   * @param {*} prop 
   * @returns 
   */
  get(e, t) {
    const r = this.owner;
    switch (t) {
      case Re:
        return e;
      case xe:
        return r;
      case me:
        return e[me];
      case Ue:
        return function(s) {
          return r === s ? e : null;
        };
      case "@id":
        return e[t];
      default:
        let o = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
        return typeof (o == null ? void 0 : o.value) == "function" ? e.constructor.prototype[t] : r.getProperty(e, t);
    }
  }
  set(e, t, r) {
    return t in { toJSON: 0 } ? !1 : (this.owner.setProperty(e, t, r), !0);
  }
  getOwnPropertyDescriptor(e, t) {
    return t === "@id" ? { configurable: !0, enumerable: !0, writable: !0 } : Reflect.getOwnPropertyDescriptor(e, t);
  }
  ownKeys(e) {
    return ["@id"].concat(Object.getOwnPropertyNames(e));
  }
  deleteProperty(e, t) {
    return !!this.owner.deleteProperty(e, t);
  }
};
var lt = { Node: mt, Handler: gt, Symbols: pt };
const U = Ie, { Utils: b } = le, { Node: Ee, Handler: ut, Symbols: Se } = lt, { $target: It, $owner: xt, $node: dt, $proxy: K, $noderef: $ } = Se, O = Symbol("size");
var j, D, ae, oe, De, E, R, d, ne, be, M, pe, Ce, Z, Pe, Te;
let yt = (j = class {
  /**
   * Create a new ROCrate object using a default template or from a valid jsonld object.
   * @param {object} json a valid jsonld object
   * @param {object} [config]
   * @param {boolean} [config.array] - Always return property of an Entity as an array (eg when using getEntity() method)
   * @param {boolean} [config.link] - Resolve linked node as nested object
   * @param {boolean} [config.replace] - When importing from json, a subsequent duplicate entity always replaces the existing one
   * @param {boolean} [config.merge] - When replacing or updating an entity, merge the values and the properties instead of full replace
   * @param {boolean} [config.duplicate] - Allow duplicate values in a property that has multiple values
   * @param {string} [config.defaultType] - The default value for `@type` to be used when adding a new entity and the property is not specified. Default to 'Thing' 
   */
  constructor(e = {}, t) {
    I(this, d);
    he(this, "defaults", U);
    /**
     * Lookup table to get a reference to existing and non-existing nodes.
     * This is needed to avoid searching for the whole graph for every "@reverse" lookup 
     * and because an entity referenced by other entities may not exist yet in the graph.
     * @type {Map<string, Node>}
     */
    I(this, D, /* @__PURE__ */ new Map());
    I(this, ae);
    I(this, oe);
    /** Lookup table to get list of entities by their type  */
    I(this, De, {});
    /** Internal representation of the context */
    I(this, E, {});
    /** Index of all context contents or terms */
    I(this, R);
    /** @deprecated Import {@link Utils} class directly*/
    he(this, "utils", b);
    !(e["@context"] || e["@graph"]) && !t && (t = e), this.config = {}, this.config.array = (t == null ? void 0 : t.array) ?? (t == null ? void 0 : t.alwaysAsArray) ?? !1, this.config.link = (t == null ? void 0 : t.link) ?? (t == null ? void 0 : t.resolveLinks) ?? !1, this.config.replace = (t == null ? void 0 : t.replace) ?? (t == null ? void 0 : t.replaceExisting) ?? !1, this.config.merge = (t == null ? void 0 : t.merge) ?? (t == null ? void 0 : t.mergeProperties) ?? !1, this.config.duplicate = (t == null ? void 0 : t.duplicate) ?? (t == null ? void 0 : t.allowDuplicates) ?? !1, this.config.defaultType = (t == null ? void 0 : t.defaultType) ?? "Thing", x(this, ae, new ut(this));
    let r = this;
    x(this, oe, {
      get(s, c) {
        let n = b.asArray(s[c]).map((p) => r.config.link ? r.getEntity(p["@id"]) : p);
        return n.length > 1 || r.config.array ? n : n[0];
      }
    }), x(this, E, b.clone(e["@context"] || U.context)), x(this, R, St(f(this, E)));
    let o = e["@graph"];
    (!Array.isArray(o) || !o.length) && (o = [
      U.datasetTemplate,
      U.metadataFileDescriptorTemplate
    ]);
    for (let s = 0; s < o.length; ++s) {
      let c = o[s];
      c["@id"] = c["@id"] || `#${s}`, this.addEntity(c);
    }
    if (this.rootId) {
      if (!this.rootDataset) throw new Error("There is no root dataset");
    } else
      throw new Error("There is no pointer to the root dataset");
  }
  get "@context"() {
    return this.context;
  }
  /** 
   * The context part of the crate. An alias for '@context'.
   * This returns the original context information. 
   */
  get context() {
    return f(this, E);
  }
  get "@graph"() {
    return this.graph;
  }
  /**
   * An array of all nodes in the graph. An alias for '@graph' 
   * @return {Array}
   */
  get graph() {
    return this.getGraph();
  }
  get graphSize() {
    return this.graph.length;
  }
  get metadataFileEntity() {
    for (let e of U.roCrateMetadataIDs) {
      let t = this.getEntity(e);
      if (t != null && b.hasType(t, "CreativeWork"))
        return t;
    }
  }
  get rootDataset() {
    return this.getEntity(this.rootId);
  }
  get rootId() {
    let e = this.metadataFileEntity;
    if (e) return e.about["@id"] || e.about[0]["@id"];
  }
  set rootId(e) {
    this.updateEntityId(this.rootId, e);
  }
  /**
   * Deep clone the instance of this crate.
   */
  clone() {
    return new j(this, this.config);
  }
  /**
   * Returns a new iterator object that contains the entities in the graph.
   */
  entities(e) {
    var t = f(this, D).values(), r = this;
    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        var c;
        for (var o, s; (o = t.next()) && !o.done; )
          if (s = o.value, s[O])
            return s = e ? s.toJSON() : A(c = r, d, be).call(c, s), { done: !1, value: s };
        return { done: !0, value: null };
      }
    };
  }
  /**
   * Add an entity to the crate.
   * @param {object} data A valid RO-Crate entity described in plain object.
   * @param {boolean} [replace] If true, replace existing entity with the same id.
   * @param {boolean} [recurse] - If true, nested entities will be added as well.
   * @return {boolean} true if the entity is successfully added.
   */
  addEntity(e, t = this.config.replace, r) {
    if (!e || !e["@id"]) return !1;
    let o = A(this, d, ne).call(this, e["@id"]), s = A(this, d, pe).call(this, o, e, { replace: t, recurse: r });
    return s && !o[O] && (o[O] = 1), s;
  }
  /**
   * Delete an entity from the graph
   * @param {string|Entity} id_or_entity - Entity Identifier or the entity object itself
   * @param {object} opt
   * @param {boolean} [opt.references] - Set true to delete all references to the deleted entity
   * @return True if any existing entity was deleted
   */
  deleteEntity(e, { references: t = !1 } = {}) {
    var o;
    const r = A(this, d, M).call(this, e);
    if (r) {
      if (t)
        for (const s in r["@reverse"])
          for (const c of b.asArray(r["@reverse"][s]))
            this.deleteValues(c["@id"], s, r[$]);
      return ft(r, (s, c) => {
        c["@id"] && ke(r[$], s, c);
      }), f(this, D).delete(r["@id"]), (o = r[K]) == null || o.revoke(), At(r[$]) > 0 && A(this, d, ne).call(this, r["@id"], r[$]), !0;
    }
    return !1;
  }
  /**
   * Update an entity by replacing the object with the same id.
   * This operations will remove all properties of the existing entity and 
   * add the new ones contained in `data`, unless `merge` argument is true.
   * @param {Object} data 
   * @param {boolean} [merge] - If true, new properties will be merged. Defaults to `config.merge`.
   * @param {boolean} [recurse] - If true, nested entities will be updated as well.
   * @return {boolean} false if there is no existing entity with the same id or data is empty.
   */
  updateEntity(e, t = this.config.merge, r) {
    let o = e["@id"], s = f(this, D).get(o);
    return s && s[O] ? A(this, d, pe).call(this, s, e, { replace: !0, merge: t, recurse: r }) : !1;
  }
  /**
   * Change the identifier of an entity node
   * @param {*} idOrEntity 
   * @param {string} newId 
   */
  updateEntityId(e, t) {
    let r = A(this, d, M).call(this, e);
    return r ? (f(this, D).delete(r["@id"]), f(this, D).set(t, r), r["@id"] = t, !0) : !1;
  }
  /**
   * Get the property of an entity
   * @param {*} idOrEntity 
   * @param {string} prop 
   * @returns {*} the value of the property
   */
  getProperty(e, t) {
    let r = A(this, d, M).call(this, e);
    if (r) {
      let o = r[t];
      if (t === "@id") return o;
      if (t === "@reverse") return new Proxy(o, f(this, oe));
      if (typeof o == "function") return o;
      if (o != null) {
        let s = b.asArray(o).map((c) => this.config.link && (c != null && c["@id"]) && this.getEntity(c["@id"]) || c);
        return s.length > 1 || this.config.array ? s : s[0] || o;
      }
      return o;
    }
  }
  /**
   * Set a property of an entity with the given value.
   * If a property with the same name exists, its existing value will be replaced with the specified value.
   * If values contain nested non-empty entities, they will be processed recursively.
   * @param {string|object} idOrEntity - The id of the entity to add the property to
   * @param {string} prop - The name of the property
   * @param {*|Array} values - A value or an array of values
   * @param {boolean} [duplicate] - If true, allow a property to have duplicate values
   */
  setProperty(e, t, r, o) {
    let s = A(this, d, M).call(this, e);
    if (!s) throw new Error("Cannot set property of a non-existant entity");
    if (t === "@reverse") throw new Error("@reverse property is read only");
    return t === "@id" ? typeof r == "string" ? this.updateEntityId(s, r) : !1 : A(this, d, Z).call(this, s, t, r, { duplicate: o, recurse: !0 });
  }
  deleteProperty(e, t) {
    if (t === "@id" || t === "@reverse" || t === "@type") throw new Error(`Property ${t} is not allowed be deleted`);
    let r = A(this, d, M).call(this, e);
    if (r && t in r) {
      Le(r, [t]);
      let o = r[t];
      return delete r[t], r[O]--, o;
    }
  }
  /**
   * Delete one or more values from a property.
   * @param {string|Entity} idOrEntity 
   * @param {string} prop 
   * @param {*} values 
   */
  deleteValues(e, t, r) {
    if (t === "@id" || t === "@reverse") throw new Error(`Property ${t} is not allowed be deleted`);
    let o = A(this, d, M).call(this, e);
    if (o && t in o) {
      let s = new Set(_(r, (p) => p["@id"]));
      Le(o, [t], (p) => s.has(p));
      let c = b.asArray(r), n = b.asArray(o[t]).filter((p) => !c.some((l) => b.isEqualRef(p, l)));
      n.length ? o[t] = n : (delete o[t], o[O]--);
    }
  }
  /**
   * Add one or more value to a property of an entity.
   * If the specified property does not exists, a new one will be set. 
   * If the property already exists, the new value will be added to the property array.
   * @param {string|object} idOrEntity - The id or the entity to add the property to
   * @param {string} prop - The name of the property
   * @param {*} values - The value of the property
   * @param {boolean} [duplicate] - If true, allow a property to have duplicate values in the array
   */
  addValues(e, t, r, o) {
    let s = A(this, d, M).call(this, e);
    if (!s) throw new Error("Cannot add values to a non-existant entity");
    if (r == null || t === "@id" || t === "@reverse") return !1;
    let c = s[Se.$noderef], n = b.asArrayRef(s[t]).length;
    return t in s ? (s[t] = A(this, d, Ce).call(this, c, t, s[t], r, { duplicate: o, recurse: !0 }), b.asArrayRef(s[t]).length > n) : A(this, d, Z).call(this, s, t, r, { duplicate: o, recurse: !0 });
  }
  /**
   * Get configuration value
   * @param {'array'|'link'|'replace'|'merge'|'duplicate'} key - Name of the config parameter
   */
  getConfig(e) {
    return this.config[e];
  }
  /**
   * Get an entity from the graph. 
   * If config.link is true, any reference (object with just "@id" property)
   * is resolved as a nested object. 
   * @param {string} id An entity identifier
   * @return {Entity|undefined} A wrapper for entity that resolves properties as linked objects
   */
  getEntity(e) {
    let t = f(this, D).get(e);
    if (t && t[O]) return A(this, d, be).call(this, t);
  }
  /**
   * Get the index of the entity in the graph array. This is an O(n) operation.
   * @param {string} entityId 
   */
  indexOf(e) {
    let t = 0;
    for (const [r, o] of f(this, D))
      if (o[O]) {
        if (r === e) return t;
        ++t;
      }
    return -1;
  }
  /**
   * Get an array of all nodes in the graph. Each node in the array is an Entity instance.
   * If config.link is true, any link to other node will be made into nested object.
   * @param {boolean} flat - If true, return the copy of entity as a plain object.
   * @return {Array}
   */
  getGraph(e = !1) {
    return Array.from(this.entities(e));
  }
  /**
   * Add a Profile URI to the crate
   * @param {string} uri A valid Profile URI
   */
  addProfile(e) {
    this.addValues(this.metadataFileEntity, "conformsTo", { "@id": e }), this.addValues(this.rootDataset, "conformsTo", { "@id": e });
  }
  addProvenance(e) {
    this.addEntity(e.corpusTool), this.addEntity(e.createAction);
  }
  /**
   * Add a new identifier as a PropertyValue to the root DataSet.
   * identifier and name are required
   * @param {object} options 
   * @param {string} options.name
   * @param {string} options.identifier 
   * @param {string} [options.description]
   * @return The added identifier or undefined
   */
  addIdentifier(e) {
    if (e.identifier && e.name && this.rootId) {
      const t = `_:local-id:${e.name}:${e.identifier}`, r = {
        "@id": t,
        "@type": "PropertyValue",
        value: e.identifier,
        name: e.name
      };
      if (e.description && (r.description = e.description), this.addValues(this.rootId, "identifier", r, !1))
        return t;
    }
  }
  /**
   * Get named identifier
   * @param {string} name 
   * @return {string} the identifier
   */
  getIdentifier(e) {
    const t = A(this, d, M).call(this, this.rootId), r = _(t.identifier, (o) => {
      const s = this.getEntity(o["@id"]);
      if (s && this.hasType(s, "PropertyValue") && s.name === e) return s;
    });
    if (r.length) return r[0].value;
  }
  /**
   * Convert the rocrate into plain JSON object.
   * The value returned by this method is used when JSON.stringify() is used on the ROCrate object.
   * @return plain JSON object
   */
  toJSON() {
    return { "@context": f(this, E), "@graph": this.getGraph(!0) };
  }
  /**
   * Return a JSON.stringify-ready tree structure starting from the specified item 
   * with all values (apart from @id) as arrays
   * and string-values expressed like: `{"@value": "string-value"}`
   * @param {object} opt 
   * @param {string|object} [opt.root]
   * @param {number} [opt.depth] The number of nesting the tree will have. Must be 0 or positive integer.
   * @param {boolean} [opt.valueObject]
   * @param {boolean} [opt.allowCycle] 
   * @returns {*} the root entity
   */
  getTree({ root: e = this.rootId, depth: t = 1 / 0, valueObject: r = !0, allowCycle: o = !1 } = {}) {
    var p;
    if (t == 1 / 0 && o) throw new Error("Option allowCycle must be set to false is depth is not finite");
    let s = (p = A(this, d, M).call(this, e)) == null ? void 0 : p.toJSON();
    if (!s || t < 0) return;
    let c = [[s, 0, /* @__PURE__ */ new Set()]], n;
    for (; n = c.shift(); ) {
      let [l, y, C] = n;
      o || (C = new Set(C), C.add(l["@id"]));
      for (let w in l) {
        let ie = l[w];
        w === "@type" ? l[w] = b.asArray(ie) : w === "@reverse" ? delete l[w] : w !== "@id" && (l[w] = b.asArray(ie).map((F) => {
          let q;
          if (F != null && (q = F["@id"])) {
            if (y < t && !C.has(q)) {
              //!this.hasType(prop, v, '@json')
              let Q = A(this, d, M).call(this, q);
              Q && (F = Q.toJSON()), c.push([F, y + 1, C]);
            }
          } else r && (F = { "@value": F });
          return F;
        }));
      }
    }
    return s;
  }
  /**
   * 
   * @param {*} items - A JSON-LD item or array of [item]
   * @param {*[]} pathArray - An array of objects that represents a 'path' through the graph.
   *   Object must have a "property" to follow, eg:
   *   `resolve(item, {"property": "miltaryService"});`
   *   and optionally a condition "includes", eg:
   *   `"includes": {"@type", "Action"}}`
   *   and optionally, a function "matchFn" which takes an item 
   *   as argument and returns a boolean, eg:
   *   `"matchFn": (item) => item['@id'].match(/anzsrc-for/)`
   * @param {*[]} [subgraph] - If present and true, all intervening items during
   *   the traversal will be stored. If an array is passed, the intervening items will be
   *   stored in the array.
   * @return {*[]|null} null, or an array of items
   */
  resolve(e, t, r) {
    const o = t.shift(), s = [], c = {};
    e = b.asArray(e);
    for (let n of e)
      if (n = this.getEntity(n["@id"]), o["@reverse"] && n["@reverse"] && (n = n["@reverse"]), n[o.property]) {
        for (let p of b.asArray(n[o.property]))
          if (p["@id"] && this.getItem(p["@id"])) {
            const l = p["@id"];
            if (!c[l]) {
              const y = this.getItem(p["@id"]);
              if (o.includes)
                for (let C of Object.keys(o.includes))
                  b.asArray(y[C]).includes(o.includes[C]) && (s.push(y), c[l] = 1);
              else o.matchFn ? o.matchFn(y) && (s.push(y), c[l] = 1) : (s.push(y), c[l] = 1);
            }
          }
      }
    if (s.length === 0) return null;
    if (r)
      for (const n of s)
        r.find((p) => p["@id"] === n["@id"]) || r.push(n);
    return t.length > 0 ? this.resolve(s, t, r) : s;
  }
  /**
   * resolveAll does a resolve but collects and deduplicates intermediate items.
   * Its first returned value is the final items (ie what resolve(..)) would have returned.
   * @param {*} items 
   * @param {*} pathArray 
   * @returns 
   */
  resolveAll(e, t) {
    let r = [];
    return [this.resolve(e, t, r), r];
  }
  /**
   * Generate a new unique id that does not match any existing id in the graph.  
   * @param {string} base - The base string of the id.
   * @return {string} The base suffixed with the incremental number. 
   */
  uniqueId(e) {
    for (var t = 1, r = e; f(this, D).has(r); )
      r = e + t++;
    return r;
  }
  /** Experimental method to turn a graph into a flat dictionary eg for turning it into a table  */
  flatify(e, t, r, o, s) {
    if (t || (t = 0), r || (r = {}), o || (o = ""), s || (s = {}), !s[e["@id"]]) {
      s[e["@id"]] = !0;
      for (let n of Object.keys(e)) {
        const p = `${o}${n}`;
        if (n === "@id")
          r[p] = e["@id"];
        else if (n === "@type")
          r[p] = e["@type"];
        else if (n != "@reverse") {
          var c = 0;
          for (let l of e[n]) {
            const y = `${p}_${c++}`;
            l["@id"] ? t > 0 && !s[l["@id"]] ? this.flatify(l, t - 1, r, y + "_", s) : l.name ? r[y] = l.name[0] : r[y] = l["@id"] : r[y] = l;
          }
        }
      }
    }
    return r;
  }
  /**
   * Generate a local flat lookup table for context terms
   */
  async resolveContext() {
    let e = this;
    x(this, R, {});
    let t = b.asArray(f(this, E)).map(async (r) => {
      if (typeof r == "string") {
        if (U.standardContexts[r])
          return U.standardContexts[r]["@context"];
        const o = await fetch(r, {
          headers: {
            accept: "application/ld+json, application/ld+json, text/text"
          }
        });
        if (!o.ok) throw new Error(o.statusText);
        return (await o.json())["@context"];
      } else
        return r;
    });
    return t = await Promise.all(t), x(this, R, t.reduce(Oe, f(this, R))), {
      _indexer: f(this, R),
      getDefinition(r) {
        var o;
        return A(o = e, d, Pe).call(o, this._indexer, r);
      }
    };
  }
  /**
   * Get the context term definition. This method will also search for term defined locally in the graph.
   * Make sure `resolveContext()` has been called prior calling this method.
   * @param {string} term 
   */
  getDefinition(e) {
    if (f(this, R))
      return A(this, d, Pe).call(this, f(this, R), e);
  }
  /**
   * Add context
   * @param {*} context 
   */
  addContext(e) {
    x(this, E, b.asArray(f(this, E))), f(this, E).push(e), Oe(f(this, R), e);
  }
  /**
   * Expand a term into the IRI, which is the same as the `@id` of the term definition.
   * @param {string} term - a short word defined in the context 
   * @return {string} 
   */
  resolveTerm(e) {
    if (f(this, R))
      return A(this, d, Te).call(this, f(this, R), e);
  }
  /**
   * Check if an entity has a type
   * @param {*} item 
   * @param {string} type 
   * @return {boolean}
   */
  hasType(e, t) {
    return b.hasType(e, t);
  }
  /**
   * This silently fails if the item has no @id or already exists - this is probably sub-optimal
   * @param {*} item 
   * @deprecated Use {@link addEntity}
   */
  addItem(e) {
    return this.addEntity(e);
  }
  /**
   * @deprecated Use {@link deleteEntity}
   * @param {string} id 
   * @return {Object} The raw data of deleted entity
   */
  deleteItem(e) {
    return this.deleteEntity(e);
  }
  /** @deprecated Not required anymore. Calling this method will do nothing. */
  addBackLinks() {
  }
  /** @deprecated Use {@link Utils.union}, eg: union([sg1, sg2]) */
  dedupeSubgraphs(e) {
    return b.union(...e);
  }
  /** @deprecated Not required anymore. Calling this method will do nothing. */
  index() {
  }
  /**
   * Add a value to an item's property array
   * @param {*} item 
   * @param {string} prop 
   * @param {*} val 
   * @param {boolean} allowDuplicates 
   * @deprecated Use {@link addValues} 
   */
  pushValue(e, t, r, o = !1) {
    this.addValues(e["@id"], t, r, o);
  }
  /** @deprecated Use {@link updateEntityId} */
  changeGraphId(e, t) {
    return this.updateEntityId(e["@id"], t);
  }
  /**
   * @param {string} id 
   * @returns {Entity} entity
   * @deprecated Use {@link getEntity}
   */
  getItem(e) {
    return this.getEntity(e);
  }
  /** @deprecated Use {@link getGraph} with argument set to true */
  getFlatGraph() {
    return this.getGraph(!0);
  }
  /** @deprecated Use {@link rootDataset} */
  getRootDataset() {
    return this.rootDataset;
  }
  /** @deprecated Use {@link rootId} */
  getRootId() {
    return this.rootId;
  }
  /** @deprecated Use {@link toJSON} */
  getJson() {
    return this.toJSON();
  }
  /** @deprecated Use {@link getIdentifier} */
  getNamedIdentifier(e) {
    return this.getIdentifier(e);
  }
  /** @deprecated Use {@link getGraph} and pass true as the argument */
  serializeGraph() {
    return this.getGraph(!0);
  }
  /** @deprecated Specify `{array: true, link: true}` in the options when creating the ROCrate instance */
  toGraph() {
    return this.config.array = !0, this.config.link = !0, !0;
  }
  /** @deprecated Use {@link getTree} with the following argument: `{ root, depth, allowCycle: true }` */
  getNormalizedTree(e, t = 1) {
    return this.getTree({ root: e, depth: t, allowCycle: !0 });
  }
  /**
   * Create a simple tree-like object - but don't make circular structures
   * @deprecated Use {@link getTree} with the valueObject argument set to false` 
   */
  objectify() {
    return this.getTree({ valueObject: !1 });
  }
}, D = new WeakMap(), ae = new WeakMap(), oe = new WeakMap(), De = new WeakMap(), E = new WeakMap(), R = new WeakMap(), d = new WeakSet(), /**
 * Create a new node or return an existing node with the given data
 * @param {string} id Identifier of the node (@id)
 * @returns {Node} a newly created or existing node that matches the id
 */
ne = function(e, t) {
  let r = f(this, D).get(e);
  return r || (t || (t = { "@id": e || this.uniqueId("entity-") }, Object.defineProperty(t, "@reverse", { value: {} })), r = new Ee(t), f(this, D).set(e, r)), r;
}, /**
 * Return a proxy that wraps a node as an entity object supporting linked objects capability.
 * @param {Node} n 
 */
be = function(e) {
  return e[K] || (e[K] = Proxy.revocable(e, f(this, ae))), e[K].proxy;
}, /**
 * 
 * @param {string|object} idOrEntity 
 * @return {Node}
 */
M = function(e) {
  var o;
  if (e instanceof Ee) {
    let s = (o = e[dt]) == null ? void 0 : o.call(e, this);
    if (s) return s;
    if (s === void 0) return e;
  }
  let t = "";
  typeof e == "string" ? t = e : typeof e["@id"] == "string" && (t = e["@id"]);
  let r = f(this, D).get(t);
  if (r != null && r[O]) return r;
}, /**
 * Init a new node or update existing one
 * @param {Node} node
 * @param {object} data Update the node with the given data
 * @param {object} opt
 * @param {boolean} [opt.replace]
 * @param {boolean} [opt.merge]
 * @param {boolean} [opt.recurse]
 * @returns {boolean} Return true if node is changed
 */
pe = function(e, t, { replace: r = this.config.replace, merge: o = this.config.merge, recurse: s }) {
  var n;
  var c = Object.keys(t).filter((p) => p !== "@id" && p !== "@reverse");
  if (e[O]) {
    if (!r || ((n = e[K]) == null ? void 0 : n.proxy) === t) return !1;
    if (!o)
      for (const p in e)
        p !== "@type" && !c.includes(p) && this.deleteProperty(e, p);
  } else c.length && (e[O] = 1);
  for (const p of c)
    A(this, d, Z).call(this, e, p, t[p], { merge: o, replace: r, recurse: s });
  return e["@type"] || A(this, d, Z).call(this, e, "@type", "Thing", {}), !0;
}, Ce = function(e, t, r, o, { duplicate: s = this.config.duplicate, replace: c = this.config.replace, merge: n = this.config.merge, recurse: p = !1 }) {
  let l = b.asArrayRef(r);
  return _(o, (y) => {
    if (s || !b.exists(l, y)) {
      let C = y;
      if (typeof y == "object")
        if (y["@id"]) {
          let w = A(this, d, ne).call(this, y["@id"]);
          p && A(this, d, pe).call(this, w, y, { replace: c, merge: n, recurse: p }), C = w[$], vt(e, t, C);
        } else
          C = b.clone(y);
      l.push(C);
    }
  }), l.length === 1 ? l[0] : l;
}, /**
 * 
 * @param {Node} entity 
 * @param {string} prop 
 * @param {*} values 
 * @param {object} opt
 * @param {boolean} [opt.duplicate]
 * @param {boolean} [opt.replace]
 * @param {boolean} [opt.recurse]
 * @param {boolean} [opt.merge]
 */
Z = function(e, t, r, { duplicate: o, replace: s, recurse: c, merge: n }) {
  let p = e[Se.$noderef];
  if (t in e || e[O]++, e[t]) {
    let l = new Set(_(r, (y) => y["@id"]));
    _(e[t], (y) => !l.has(y["@id"]) && ke(p, t, y));
  }
  return r == null ? e[t] = r : e[t] = A(this, d, Ce).call(this, p, t, [], r, { duplicate: o, replace: s, recurse: c, merge: n }) ?? [], !0;
}, Pe = function(e, t) {
  var s;
  var r = { "@id": A(this, d, Te).call(this, e, t) };
  let o;
  if (r["@id"] && (o = this.getEntity(r["@id"]))) {
    let c;
    (c = (s = o.sameAs) == null ? void 0 : s["@id"]) && (r["@id"] = c, o = this.getEntity(c)), o && (this.hasType(o, "rdfs:Class") || this.hasType(o, "rdf:Property")) && (r = o);
  }
  return r;
}, Te = function(e, t) {
  if (t.match(/^http(s?):\/\//i))
    return t;
  t = t.replace(/^schema:/, "");
  const r = e[t];
  var o, s;
  if (r && r.match(/^http(s?):\/\//i))
    return r;
  if ((r && (o = r.match(/(.*?):(.*)/)) || (o = t.match(/(.*?):(.*)/))) && (s = e[o[1]]), s && s.match(/^http(s?):\/\//i))
    return `${s}${o[2]}`;
}, he(j, "defaults", U), j);
function _(i, e) {
  let t = [];
  for (let r of b.asArray(i))
    if (r != null) {
      let o = e(r);
      o != null && t.push(o);
    }
  return t;
}
function ft(i, e, t = {}) {
  let r = t[O] || 0;
  for (let o in i) {
    let s = _(i[o], (c) => e(o, c));
    s = s.length > 1 ? s : s[0], s && (t[o] = s, r++);
  }
  return t[O] = r, t;
}
function Oe(i, e) {
  for (let t in e) {
    const r = e[t];
    r && (i[t] = r["@id"] || r);
  }
  return i;
}
function vt(i, e, t) {
  let r = t["@reverse"] || {}, o = r[e] = r[e] || [];
  o.includes(i) || o.push(i);
}
function ke(i, e, t) {
  let r = t["@reverse"];
  if (r) {
    let o = r[e].indexOf(i);
    o > -1 && r[e].splice(o, 1);
  }
}
function At(i) {
  return Object.values(i["@reverse"]).reduce((e, t) => e + b.asArray(t).length, 0);
}
function Le(i, e, t) {
  var r = i[$], o = e ?? Object.keys(i);
  for (const s of o)
    for (const c of b.asArray(i[s])) {
      const n = c == null ? void 0 : c["@reverse"];
      if (n && (!t || t(c["@id"]))) {
        let p = n[s].indexOf(r);
        p > -1 && n[s].splice(p, 1);
      }
    }
}
function St(i) {
  var t;
  var e;
  for (let r of b.asArray(i))
    typeof r == "string" && (r = (t = U.standardContexts[r]) == null ? void 0 : t["@context"]), typeof r == "object" && (e || (e = {}), Oe(e, r));
  return e;
}
var bt = { ROCrate: yt };
const { Utils: N } = le;
function Ne(i, e) {
  const t = N.asArray(e).map((r) => r.toLowerCase());
  return N.asArray(i).some((r) => t.includes(r.toLowerCase()));
}
let He = class {
  /**
   * 
   * @param {ROCrate} crate 
   */
  constructor(e) {
    this.crate = e, this.checklist = [];
  }
  async hasContext() {
    var e = new L({
      name: "Has @context",
      message: "Has an appropriate context with a name and version"
    });
    for (let t of N.asArray(this.crate["@context"]))
      if (typeof t == "string" || t instanceof String)
        try {
          const r = await fetch(
            /**@type {string}*/
            t,
            {
              headers: {
                accept: "application/ld+json, application/ld+json, text/text"
              }
            }
          );
          if (r.ok) {
            const o = await r.json();
            if (N.asArray(o.name).includes("RO-Crate JSON-LD Context")) {
              e.message = `Has a context named "RO-Crate JSON-LD Context", version ${o.version}`, e.status = !0;
              break;
            }
          } else
            throw new Error(r.statusText);
        } catch (r) {
          console.error(r), e.message = r + " for " + t, e.status = !1;
          break;
        }
    return e;
  }
  hasRootDataset() {
    return new L({
      name: "Has root Dataset",
      message: "There is a JSON-LD item with @type of Dataset (http://schema.org/dataset)",
      status: !!this.crate.rootDataset
    });
  }
  hasRootDatasetWithProperID() {
    const e = this.crate.rootDataset;
    return new L({
      name: "Root dataset has appropriate @id",
      message: 'The root dataset @id ends in "/"',
      status: !!(e && e["@id"].endsWith("/"))
    });
  }
  hasName() {
    const e = this.crate.rootDataset;
    return new L({
      name: "Has name",
      message: "The root Dataset has a name (http://schema.org/name)",
      status: !!(e && e.name && e.name.length > 0)
    });
  }
  hasDescription() {
    const e = this.crate.rootDataset;
    return new L({
      name: "Has description",
      message: "The root Dataset has a description (http://schema.org/description)",
      status: !!(e && e.description && e.description.length > 0)
    });
  }
  hasAuthor() {
    const e = this.crate.rootDataset, t = N.asArray(e == null ? void 0 : e.author).map((r) => this.crate.getEntity(r["@id"]));
    return new L({
      name: "Has valid Authors",
      message: "The root Dataset has at least one Author (http://schema.org/author) referred to by @id, and all authors have @type Person (http://schema.org/Person) or Organization (http://schema.org/Organization)",
      status: t.length > 0 && t.every((r) => Ne(r == null ? void 0 : r["@type"], ["Person", "Organization"]))
    });
  }
  hasLicense() {
    const e = this.crate.rootDataset, t = N.asArray(e == null ? void 0 : e.license).map((r) => this.crate.getEntity(r["@id"]));
    return new L({
      name: "Has a license ",
      message: "The root Dataset has a License" + t.map(
        (r) => r && r.name && r.description && Ne(r["@type"], "CreativeWork") ? " (the license is a Creative Work with a name and description as it SHOULD be)" : ""
      ).join(""),
      status: t.length > 0
    });
  }
  hasDatePublished() {
    var r;
    const e = this.crate.rootDataset;
    var t = N.asArray(e == null ? void 0 : e.datePublished);
    return new L({
      name: "Has a datePublished ",
      message: "The root Dataset has a datePublished with ONE value which is an  ISO 8601 format  precision of at least a day",
      diagnostics: t.length === 1 ? "" : `Number of datePublished values is ${t.length} NOT 1`,
      status: !!(t.length === 1 && ((r = t[0]) != null && r.match(/^\d{4}-([0]\d|1[0-2])-([0-2]\d|3[01])/)))
    });
  }
  hasContactPoint() {
    const e = this.crate.rootDataset;
    var t = N.asArray(e == null ? void 0 : e.contactPoint).map((r) => this.crate.getEntity(r["@id"]));
    return new L({
      name: "Has a contactPoint",
      message: "The root Dataset has at least one contactPoint property which references a ContactPoint of type Customer Service",
      status: t.some((r) => r && r.email && N.asArray(r["@type"]).includes("ContactPoint") && N.asArray(r.contactType).includes("customer service"))
    });
  }
  async check() {
    var e = Ct.filter((r) => !(r in { hasContext: 0, hasAuthor: 0, hasContactPoint: 0 })), t = await this.hasContext();
    this.checklist = [t].concat(e.map((r) => this[r]())), this.isROCrate = this.checklist.every((r) => r.status);
  }
  summarize() {
    return this.isROCrate ? "This is a valid RO-Crate" : "This is not a valid RO-Crate";
  }
  report() {
    var e = [];
    for (var t of this.checklist) {
      const r = t.status ? "✔️" : "❌";
      e.push(`${r}   ${t.name}: ${t.message}`);
    }
    return e.join(`
`);
  }
  async validate() {
    await this.check();
    const e = this.summarize(), t = this.report();
    return `${e}
${t}`;
  }
};
const Ct = Object.getOwnPropertyNames(He.prototype).filter((i) => i.startsWith("has"));
class L {
  constructor(e) {
    this.name = e.name, this.message = e.message, this.status = e.status ?? !1, e.diagnostics && (this.diagnostics = e.diagnostics);
  }
}
var Pt = { Checker: He, CheckItem: L };
const { ROCrate: Tt } = bt, { Checker: Ot } = Pt, { Utils: Dt } = le, Rt = Ie;
var Ve = {
  ROCrate: Tt,
  Checker: Ot,
  Utils: Dt,
  Defaults: Rt
};
const X = {
  error: "errors",
  warn: "warnings",
  info: "info"
};
function B(i, e, t, r = {}) {
  const o = { results: r };
  for (const s in X)
    r[X[s]] || (r[X[s]] = []);
  for (let s in i) {
    const c = i[s].clause;
    for (const n in X)
      o[n] = function(p = c) {
        r[X[n]].push({
          entity: e["@id"],
          property: s,
          message: p,
          clause: c
        });
      };
    i[s].validate(o, e[s], e, t);
  }
  return r;
}
function wt(i, e) {
  if (!e["@type"]) return;
  const t = new Set(i);
  for (const r of e["@type"])
    if (t.has(r)) return r;
}
const ee = "https://purl.archive.org/language-data-commons/profile#Collection", te = "https://purl.archive.org/language-data-commons/profile#Object";
function re(i) {
  try {
    let e = new URL(i);
    return !0;
  } catch {
  }
  return !1;
}
const H = {
  "@id": {
    clause: 'MUST have an @id property and the value must be a valid URI or "./"',
    validate: function({ error: i }, e) {
      e ? !re(e) && e != "./" && i("The value of @id is not a valid URI") : i("There is no @id property");
    }
  },
  name: {
    clause: "MUST have a single name value which is a string with one or more characters",
    validate: function({ error: i }, e) {
      e && e.length ? e.length > 1 ? i("There is more than one name") : typeof e[0] != "string" ? i("Value is not a string") : e[0].length === 0 && i("Value must have one or more characters") : i("There is no name property");
    }
  },
  inLanguage: {
    clause: "MAY have an `inLanguage` property which is a reference to one or more Language items",
    validate: function({ error: i, info: e, results: t }, r, o, s) {
      if (!r || !r.length) {
        e("Does not have an `inLanguage` property");
        return;
      }
      e("Does have an `inLanguage` property");
      for (let c of r)
        B(G.Language, c, s, t);
    }
  },
  subjectLanguage: {
    clause: "MAY have a `subjectLanguage` property which is a reference to one or more Language items",
    validate: function({ error: i, info: e, results: t }, r, o, s) {
      if (!r || !r.length) {
        e("Does not have a `subjectLanguage` property");
        return;
      }
      e("Does have a `subjectLanguage` property");
      for (let c of r)
        B(G.Language, c, s, t);
    }
  },
  contentLocation: {
    clause: "MAY have a `contentLocation` property which is a reference to one or more `Place` items",
    validate: function({ error: i, info: e, results: t }, r, o, s) {
      if (!r || !r.length) {
        e("Does not have a `contentLocation` property");
        return;
      }
      e("Does have a `contentLocation` property");
    }
  }
}, Ge = {
  license: {
    clause: "MUST have a `license` property with reference to an entity of type [File, DataReuseLicense] with an `@id` property that starts with `LICENSE` and a `URL` property that is a valid URL",
    validate: function({ error: i, info: e, results: t }, r, o, s) {
      if (!r) {
        i("Does not have a license property");
        return;
      }
      for (let c of r)
        if (c["@id"]) {
          const n = s.getEntity(c["@id"]);
          c["@id"].match(/^LICENSE/) || i("License @id does not start with LICENSE"), n ? (n["@type"].includes("File") || i(
            `There is a reference to a LICENSE entity but it does not have "File" as a type value: ${JSON.stringify(
              c
            )}`
          ), n["@type"].includes("DataReuseLicense") || i(
            `There is a reference to a LICENSE entity but it does not have "DataReuseLicense" as a @type value: ${JSON.stringify(
              c
            )}`
          ), !re(n.URL) && !re(n["@id"].URL) && i(
            `There is a reference to a LICENSE entity but it does not have a \`URL\` property which is a well-formed URL: ${JSON.stringify(
              c
            )}`
          )) : i("License property does not reference a licence file");
        }
    }
  }
}, We = {
  "@type": {
    clause: "MUST have a `@type` attribute that that includes in its values `Dataset` and either `RepositoryCollection` or `RepositoryObject`",
    validate: function({ error: i, info: e, warn: t, results: r }, o, s, c) {
      var n;
      const p = new Set(o);
      p.has("Dataset") || i(' MUST include a "Dataset"'), p.has("RepositoryCollection") && (n = "RepositoryCollection"), p.has("RepositoryObject") && (n ? i(
        "MUST NOT have both `RepositoryCollection` and `RepositoryObject` as values in `@type`"
      ) : n = "RepositoryObject"), n || (i(
        "MUST have `RepositoryCollection` or `RepositoryObject` as values in `@type`"
      ), n = "Common"), We._propertyNames.validate(
        { results: r, error: i, warn: t, info: e },
        null,
        null,
        c
      ), B(G[n], s, c, r);
    }
  },
  conformsTo: {
    clause: `MUST have a conformsTo which references the profile URL for either a Collection (${ee}) or an Object (${te}) but not both`,
    validate: function({ error: i }, e, t, r) {
      if (!e || !e.length)
        return i("Does not have conformsTo" + e);
      var o = new Set(e.map((s) => s["@id"]));
      o.has(ee) && o.has(te) ? i("Cannot have both Collection and Object profiles") : !o.has(ee) && !o.has(te) && i("Does not conform to this profile");
    }
  },
  license: Ge.license,
  datePublished: {
    //cardinality: '1',
    clause: "MUST have  a `datePublished` property (per RO-Crate) exactly one value which is a string that parses as ISO-8601 to the level of at least a year. E.g.: 2000, 2000-10, 2000-10-01T12:34:56+10",
    validate: function({ error: i }, e) {
      (!e || !e.length === 1 || isNaN(Date.parse(e[0]))) && i();
    }
  },
  publisher: {
    clause: "MUST have a `publisher` property (per RO-Crate) which MUST have an ID which is a URL\n",
    validate({ error: i, info: e, results: t }, r) {
      if (!r || !r.length) {
        i("Does not have a Publisher");
        return;
      }
      re(r[0]["@id"]) || i("Publisher @id is not a URL");
    }
  },
  _propertyNames: {
    clause: "SHOULD have property names which resolve using the supplied context",
    validate: function({ results: i, error: e, warn: t, info: r }, o, s, c) {
      const n = {};
      for (let p of c.getGraph())
        for (let l of Object.keys(p))
          !n[l] && !["@id", "@type"].includes(l) && (c.resolveTerm(l) || t(
            `Property \`${l}\` is not defined in the crate's context`
          )), n[l] = !0;
    }
  }
}, we = {
  "@id": H["@id"],
  "@type": {
    clause: "MUST have a type value of “RepositoryCollection” and MUST NOT have a type of “RepositoryObject”",
    validate: function({ error: i }, e) {
      const t = new Set(e);
      t.has("RepositoryCollection") || i("@type MUST include “RepositoryCollection”"), t.has("RepositoryObject") && i("@type MUST NOT include “RepositoryObject”");
    }
  },
  name: H.name,
  conformsTo: {
    clause: "MUST have a conformsTo which references the Collection profile URL",
    validate: function({ error: i }, e, t, r) {
      if (!e || !e.length) return i("Does not have conformsTo ");
      var o = new Set(e.map((s) => s["@id"]));
      o.has(ee) || i(), o.has(te) && i("MUST NOT have Object profile");
    }
  },
  description: {
    clause: "MUST have at least one `description` value which is a string with one or more characters",
    validate: function({ error: i }, e) {
      (!e || !e.length || !e[0].length) && i();
    }
  },
  hasMember: {
    clause: "MAY have one or more references to Collection or Object entities, which may be included in the crate or have MUST have @id properties which are URIs",
    validate({ error: i, info: e, results: t }, r, o, s) {
      if (!r || !r.length) return e();
      for (const c of r) {
        const n = c["@id"];
        if (n && s.getItem(n)) {
          const p = s.getEntity(n);
          if (p) {
            let l = wt(["RepositoryCollection", "RepositoryObject"], p) || "Common";
            l || i(
              `Embedded entities in hasMember MUST include either one of “RepositoryCollection” or “RepositoryObject” (${n} does not)`
            ), B(G[l], c, s, t);
          }
        } else
          re(c["@id"]) || i(
            `hasMember @id is not in this crate and is not a URL (${n}) `
          );
      }
    }
  },
  communicationMode: {
    clause: "MAY have a `communicationMode` property which SHOULD be a reference to one or more of the Language Data Commons Communication Mode Terms: SpokenLanguage,  WrittenLanguage,  Song,  Gesture,  SignedLanguage,  WhistledLanguage (this information may be summarisable from collection members)",
    validate({ error: i, info: e, warn: t, results: r }, o, s, c) {
      if (!o || o.length === 0) {
        e("Does not have a communicationMode property");
        return;
      }
      modalities = [
        "http://purl.archive.org/language-data-commons/terms#SpokenLanguage",
        "http://purl.archive.org/language-data-commons/terms#WrittenLanguage",
        "http://purl.archive.org/language-data-commons/terms#Song",
        "http://purl.archive.org/language-data-commons/terms#Gesture",
        "http://purl.archive.org/language-data-commons/terms#SignedLanguage",
        "http://purl.archive.org/language-data-commons/terms#WhistledLanguage"
      ], e("DOES have a `communicationMode` property");
      for (m of o)
        modalities.includes(m["@id"]) || t(`communicationMode value is not expected: ${JSON.stringify(m)}`);
    }
  },
  linguisticGenre: {
    clause: "MAY have a `linguisticGenre` property which is a reference to one or more of the Langauge Data Commons LinguistGenre Terms:  Formulaic, Thesaurus, Dialogue, Oratory, Report, Ludic, Procedural, Narrative, Interview, Drama, Informational (this information may be summarisable from collection members)",
    validate({ error: i, info: e, results: t }, r) {
      if (!r || !r.length) {
        e("Does not have a linguistic genre");
        return;
      }
      report("DOES have a `linguisticGenre` property");
    }
  },
  inLanguage: H.inLanguage,
  subjectLanguage: H.subjectLanguage,
  contentLocation: H.contentLocation,
  dateFreeText: {
    clause: "MAY have a `dateFreeText` property",
    validate({ error: i, info: e, results: t }, r) {
      if (!r || !r.length)
        e("Does not have a dateFreeText");
      else {
        e("Does have a dateFreeText");
        for (v of r)
          typeof v != "string" && warn("dateFreeText value is not a string");
      }
    }
  }
}, je = {
  // Optional Data types for distinguishing between materials
  PrimaryMaterial: {
    clause: "SHOULD have a hasPart referencing an item of @type File with an addition @type value  of PrimaryMaterial"
  },
  Annotation: {
    clause: "MAY have a hasPart referencing an item of @type File with an addition @type value  of Annotation"
  },
  DerivedMaterial: {
    clause: "MAY have a hasPart referencing an item of @type File with an addition @type value  of DerivedMaterial"
  }
}, Mt = {
  conformsTo: {
    clause: "MUST have a conformsTo which references the Object profile URL",
    validate: function({ error: i }, e, t, r) {
      if (!e || !e.length)
        return i("Does not have conformsTo ${values}");
      var o = new Set(e.map((s) => s["@id"]));
      o.has(te) || i(), o.has(ee) && i("MUST NOT have Collection profile");
    }
  },
  inLanguage: H.inLanguage,
  subjectLanguage: H.subjectLanguage,
  contentLocation: H.contentLocation,
  hasPart: {
    clause: "SHOULD have a hasPart property referencing at least one item of type [File, PrimaryMaterial] and MAY have [File, Annotation] and [File, DerivedMaterial] items which are inter-related using annotionOf, derivedFrom properties.",
    validate: function({ error: i, info: e, warn: t, results: r }, o, s, c) {
      const n = {
        PrimaryMaterial: [],
        Annotation: [],
        DerivedMaterial: []
      };
      if (!o) {
        e("Does not have a `hasPart` property");
        return;
      }
      for (let p of o) {
        const l = new Set(p["@type"]);
        for (let y of Object.keys(n))
          l.has(y) && n[y].push(p), p.inLanguage || (p.inLanguage = s.inLanguage, e(
            `inLanguage property not present on hasPart entity ${p["@id"]} - inheriting from  ${s["@id"]}`
          ));
      }
      for (let p of Object.keys(n))
        n[p].length === 0 && e(je[p].clause);
      for (let p of n.PrimaryMaterial)
        B(ge, p, c, r);
      for (let p of n.DerivedMaterial)
        B(ze, p, c, r);
      for (let p of n.Annotation)
        B($e, p, c, r);
    }
  }
}, qe = {
  "@id": {
    clause: "MUST have an @id property and the value must start with `https://collection.aiatsis.gov.au/austlang/language/` or `https://glottolog.org/resource/`",
    validate: function({ error: i }, e, t, r) {
      e ? e.startsWith(
        "https://collection.aiatsis.gov.au/austlang/language/"
      ) || e.startsWith("https://glottolog.org/resource/") || i("The value of @id not start with the right URL") : i("There is no @id property");
    }
  }
}, ge = {
  "@type": {
    clause: 'MUST have a @type value of “PrimaryMaterial" and MAY have other @type values',
    validate: function({ error: i }, e) {
      e.includes("PrimaryMaterial") || i("@type MUST include “PrimaryMaterial”");
    }
  },
  communicationMode: we.communicationMode,
  inLanguage: {
    clause: "MUST have an `inLanguage` property, or the RepositoryObject that is `isPartOf` MUST have an `inLanguage` property, referencing a Language item (language my be inhereted from the parent RepoObject)",
    validate({ error: i, results: e }, t) {
      if (!t || !t.length) {
        i("There is no language property");
        return;
      }
      for (const r of t)
        B(qe, r, e);
    }
  }
}, ze = {
  "@type": {
    clause: 'MUST have a @type value of “DerivedMaterial" and MAY have other @type values',
    validate: function({ error: i }, e) {
      e.includes("DerivedMaterial") || i("@type MUST include “DerivedMaterial”");
    }
  },
  communicationMode: we.communicationMode,
  inLanguage: ge.inLanguage,
  derivedFrom: {
    clause: "SHOULD have a derivedFrom property which references a PrimaryMaterial entity",
    validate({ error: i, info: e, warn: t, results: r }, o, s, c) {
      if (!o || o.length === 0) {
        t("Does not have a derivedFrom property");
        return;
      }
      for (let n of o)
        n["@id"] ? (referencedItem = c.getEntity(n["@id"]), referencedItem ? ge["@type"].validate(
          { results: r, error: i, warn: t, info: e },
          referencedItem["@type"],
          referencedItem,
          null
        ) : e(
          `Property value does not resolve to another entity in this crate: ${JSON.stringify(
            n
          )}`
        )) : t(`Property value is not a reference to another entity: ${n}`);
    }
  }
}, $e = {
  "@type": {
    clause: 'MUST have a @type value of “Annotation" and MAY have other @type values',
    validate: function({ error: i }, e) {
      e.includes("Annotation") || i("@type MUST include “Annotation”");
    }
  },
  annotationType: {
    clause: "MAY have an `annotationType` property which SHOULD be a reference to one or more of the Language Data Commons Annotation Type Terms: Phonemic, Phonetic, Phonological, Syntactic, Translation, Semantic, Transcription, Prosodic",
    validate({ error: i, info: e, warn: t, results: r }, o, s, c) {
      if (!o || o.length === 0) {
        e("Does not have an `annotationType` property");
        return;
      }
      annotationTypes = [
        "http://purl.archive.org/language-data-commons/terms#Phonemic",
        "http://purl.archive.org/language-data-commons/terms#Phonetic",
        "http://purl.archive.org/language-data-commons/terms#Phonological",
        "http://purl.archive.org/language-data-commons/terms#Syntactic",
        "http://purl.archive.org/language-data-commons/terms#Translation",
        "http://purl.archive.org/language-data-commons/terms#Semantic",
        "http://purl.archive.org/language-data-commons/terms#Transcription",
        "http://purl.archive.org/language-data-commons/terms#Prosodic"
      ], e("DOES have an `annotationType` property");
      for (a of o)
        annotationTypes.includes(a["@id"]) || t(`annotationType value is not expected: ${JSON.stringify(a)}`);
    }
  },
  conformsTo: {
    clause: 'MAY have a `conformsTo` property which references a schema file which in turn MUST have `conformsTo` property of  {"@id": "https://specs.frictionlessdata.io/table-schema/"} ',
    validate({ error: i, info: e, warn: t, results: r }, o, s, c) {
      if (s.encodingFormat.includes("text/csv") && s.conformsTo) {
        var n = o.map((p) => p["@id"]);
        for (let p of n) {
          const l = c.getEntity(p);
          if (l && l["@type"].includes("File")) {
            var n = l.conformsTo.map((C) => C["@id"]);
            n.includes(
              "https://specs.frictionlessdata.io/table-schema/"
            ) && e(
              "DOES have an `conformsTo` property that indicates this is a frictionless data table schema"
            );
          }
        }
      }
    }
  },
  annotationOf: {
    clause: "SHOULD have an `annotationOf` property which references another entity",
    validate({ error: i, info: e, warn: t, results: r }, o, s, c) {
      if (!o || o.length === 0) {
        t("Does not have an `annotationOf` property");
        return;
      }
      e("Does have an `annotationOf` property");
      for (let n of o)
        n["@id"] ? (referencedItem = c.getEntity(n["@id"]), referencedItem ? e(
          `Property value does resolve to another entity in this crate: ${JSON.stringify(
            n
          )}`
        ) : e(
          `Property value does not resolve to another entity in this crate: ${JSON.stringify(
            n
          )}`
        )) : t(`Property value is not a reference to another entity: ${n}`);
    }
  }
}, Et = {
  "@type": {
    clause: 'MUST have a @type value of "Place" and MAY have other @type values',
    validate: function({ error: i }, e) {
      e.includes("Place") || i('@type MUST include "Place"');
    }
  },
  geo: {
    clause: "MAY have a geo property, which is a reference to one or more Geometry entities",
    validate({ error: i, results: e }, t) {
      if (!t || !t.length) {
        i("There is no geo property");
        return;
      }
      for (const r of t)
        B(G.Geometry, r, e);
    }
  }
}, kt = {
  "@type": {
    clause: 'MUST have a @type value of "Geometry" and MAY have other @type values',
    validate: function({ error: i }, e) {
      e.includes("Geometry") || i('@type MUST include "Geometry"');
    }
  },
  asWKT: {
    clause: "MUST have one or more asWKT property, which is text encoding the location coordinates",
    validate({ error: i, results: e }, t) {
      if (!t || !t.length) {
        i("There is no asWKT property");
        return;
      }
    }
  }
}, G = {
  Common: H,
  License: Ge,
  Dataset: We,
  RepositoryCollection: we,
  RepositoryObject: Mt,
  PrimaryMaterial: ge,
  DerivedMaterial: ze,
  Language: qe,
  LanguageDataTypes: je,
  Annotation: $e,
  Place: Et,
  Geometry: kt
}, ce = {};
class Lt {
  /**
   *
   * @param {object} crate
   * @returns
   */
  static validate(e) {
    return B(G.Dataset, e.rootDataset, e);
  }
  static generateSpec(e) {
    const t = {};
    for (const c in G) {
      let n = "";
      const p = G[c];
      for (const l in p)
        n += `- ${p[l].clause}

`;
      t[c] = n;
    }
    const r = {};
    for (const c of ce.readdirSync("examples")) {
      const n = ce.join("examples", c, "ro-crate-metadata.json");
      try {
        const p = JSON.parse(ce.readFileSync(n, "utf8"));
        r[c] = new Ve.ROCrate(p, { array: !0, link: !0 });
      } catch {
      }
    }
    function o(c, n) {
      var p = "";
      if (c && r[c]) {
        n = [].concat(n);
        let l = "";
        for (const y of n) {
          const C = r[c].getEntity(y);
          C && (l += "```json\n" + JSON.stringify(C.toJSON(), null, 2) + "\n```\n");
        }
        l && (l += `[source](../example/${c}/README.md)

`, p += l);
      }
      return p;
    }
    const s = ce.readFileSync(e || "templates/profile.md");
    return new Function(
      "rules",
      "exampleEntities",
      "return `" + s + "`;"
    )(t, o);
  }
  static generateDescribo() {
  }
}
function Ht(i) {
  const e = { alwaysAsArray: !0, link: !0 }, t = new Ve.ROCrate(i, e);
  return Lt.validate(t);
}
export {
  Ht as validate
};
