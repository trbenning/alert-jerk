namespace CsAlertClient
{
    using System.Linq;
    using System.Speech.Synthesis;

    class Program
    {
        static void Main(string[] args)
        {
            var synth = new SpeechSynthesizer();
            var voice = synth.GetInstalledVoices()
                .FirstOrDefault(v => v.VoiceInfo.Gender == VoiceGender.Female);

            synth.SelectVoiceByHints(VoiceGender.Female);
            synth.Speak("Hello world!");
        }
    }
}
