import {
  ComponentFixture,
  TestBed,
  waitForAsync,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { MainLayoutComponent } from './main-layout.component';
import { AuthService, UserProfile } from '../../services/auth.service';

import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  DashboardOutline,
  WalletOutline,
  StarOutline,
  CreditCardOutline,
  HistoryOutline,
  SettingOutline,
  MenuUnfoldOutline,
  MenuFoldOutline,
  UserOutline,
  LogoutOutline,
} from '@ant-design/icons-angular/icons';

const testIcons = [
  DashboardOutline,
  WalletOutline,
  StarOutline,
  CreditCardOutline,
  HistoryOutline,
  SettingOutline,
  MenuUnfoldOutline,
  MenuFoldOutline,
  UserOutline,
  LogoutOutline,
];

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let currentUserSubject: BehaviorSubject<UserProfile | null>;

  const mockUser: UserProfile = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    cpf: '123456',
  };

  beforeEach(waitForAsync(() => {
    currentUserSubject = new BehaviorSubject<UserProfile | null>(null);

    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isLoggedIn',
      'fetchAndStoreUserProfile',
      'logout',
    ]);

    Object.defineProperty(mockAuthService, 'currentUser$', {
      get: () => currentUserSubject.asObservable(),
    });

    TestBed.configureTestingModule({
      imports: [MainLayoutComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideNzIcons(testIcons),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
  }));

  afterEach(() => {
    currentUserSubject.next(null);
  });

  it('should create', () => {
    mockAuthService.isLoggedIn.and.returnValue(false);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('ngOnInit: deve exibir dados do usuário se já estiver disponível no currentUser$', () => {
    currentUserSubject.next(mockUser);
    mockAuthService.isLoggedIn.and.returnValue(true);

    fixture.detectChanges();

    expect(component.user).toEqual(mockUser);
    expect(mockAuthService.fetchAndStoreUserProfile).not.toHaveBeenCalled();

    const userNameEl = fixture.nativeElement.querySelector(
      '.user-name'
    ) as HTMLElement;
    expect(userNameEl.textContent).toContain(mockUser.first_name);
  });

  it('ngOnInit: deve buscar usuário se logado mas currentUser$ for nulo (Page Reload)', fakeAsync(() => {
    mockAuthService.isLoggedIn.and.returnValue(true);

    mockAuthService.fetchAndStoreUserProfile.and.returnValue(
      of(mockUser).pipe(delay(0))
    );

    fixture.detectChanges();

    expect(mockAuthService.isLoggedIn).toHaveBeenCalled();
    expect(mockAuthService.fetchAndStoreUserProfile).toHaveBeenCalledTimes(1);

    expect(component.user).toBeNull();

    currentUserSubject.next(mockUser);
    tick();
    fixture.detectChanges();

    expect(component.user).toEqual(mockUser);
    const userNameEl = fixture.nativeElement.querySelector(
      '.user-name'
    ) as HTMLElement;
    expect(userNameEl.textContent).toContain(mockUser.first_name);
  }));

  it('ngOnInit: não deve buscar usuário se não estiver logado', () => {
    mockAuthService.isLoggedIn.and.returnValue(false);

    fixture.detectChanges();

    expect(mockAuthService.isLoggedIn).toHaveBeenCalled();
    expect(mockAuthService.fetchAndStoreUserProfile).not.toHaveBeenCalled();
    expect(component.user).toBeNull();

    const userHeaderEl = fixture.nativeElement.querySelector(
      '.header-right'
    ) as HTMLElement;
    expect(userHeaderEl).toBeFalsy();
  });

  it('logout: deve chamar authService.logout()', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
  });

  it('ngOnDestroy: deve se desinscrever (unsubscribe) do userSubscription', () => {
    mockAuthService.isLoggedIn.and.returnValue(false);
    fixture.detectChanges();

    const subscription = (component as any).userSubscription as Subscription;

    expect(subscription.closed).toBeFalse();

    fixture.destroy();

    expect(subscription.closed).toBeTrue();
  });
});
