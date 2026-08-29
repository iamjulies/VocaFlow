using System;
using System.IO;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;

namespace VocaFlow
{
    internal static class Program
    {
        [STAThread]
        static void Main()
        {
            ApplicationConfiguration.Initialize();
            Application.Run(new MainForm());
        }
    }

    public class MainForm : Form
    {
        private WebView2? _webView;

        public MainForm()
        {
            Text = "VocaFlow v0.10.8-beta-9.7 - Học Từ Vựng Cá Nhân Hóa (Offline-First)";
            Width = 1100;
            Height = 760;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = System.Drawing.Color.FromArgb(15, 23, 42); // #0f172a
            MinimumSize = new System.Drawing.Size(700, 500);

            // Load app icon if exists
            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app_icon.ico");
            if (File.Exists(iconPath))
            {
                Icon = new System.Drawing.Icon(iconPath);
            }

            KeyPreview = true;
            KeyDown += (s, e) =>
            {
                if (e.KeyCode == Keys.F5 || (e.Control && e.KeyCode == Keys.R))
                {
                    _webView?.CoreWebView2?.Reload();
                    e.Handled = true;
                }
            };

            InitializeWebView();
        }

        private async void InitializeWebView()
        {
            try
            {
                _webView = new WebView2
                {
                    Dock = DockStyle.Fill
                };
                Controls.Add(_webView);

                // Set user data folder for offline persistent storage
                string userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "VocaFlow_Desktop"
                );

                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await _webView.EnsureCoreWebView2Async(env);

                _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                _webView.CoreWebView2.Settings.AreDevToolsEnabled = true;

                // Sync title with web page title
                _webView.CoreWebView2.DocumentTitleChanged += (s, e) =>
                {
                    if (!string.IsNullOrWhiteSpace(_webView.CoreWebView2.DocumentTitle))
                    {
                        this.Text = _webView.CoreWebView2.DocumentTitle;
                    }
                };

                // Path to local vocaflow.html
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string htmlPath = Path.Combine(baseDir, "vocaflow.html");
                
                // Fallback check parent directories if needed
                if (!File.Exists(htmlPath))
                {
                    htmlPath = Path.Combine(baseDir, "..", "..", "..", "..", "vocaflow.html");
                }
                if (!File.Exists(htmlPath))
                {
                    htmlPath = @"C:\Users\DELL\Documents\Modding\browser\vocaflow.html";
                }

                if (File.Exists(htmlPath))
                {
                    _webView.CoreWebView2.Navigate(new Uri(Path.GetFullPath(htmlPath)).AbsoluteUri);
                }
                else
                {
                    MessageBox.Show(
                        "Không tìm thấy file vocaflow.html tại: " + htmlPath,
                        "VocaFlow Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Lỗi khởi động WebView2: " + ex.Message,
                    "VocaFlow",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
